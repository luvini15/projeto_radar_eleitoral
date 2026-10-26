from fastapi import APIRouter,Depends,Query,HTTPException,Request
from fastapi.responses import FileResponse,Response
from pydantic import BaseModel,Field
from sqlmodel import Session,select
from app.database import get_session
from app.models import GeneratedReport,Campaign
from app.services.digital_reports import REPORT_TYPE,save_report,read_report,cache_image

router=APIRouter(prefix="/api",tags=["digital reports"])

class DigitalReportInput(BaseModel):
    start_date:str
    end_date:str
    slate_ids:list[int]=Field(default_factory=list,max_length=50)
    profile_id:int|None=Field(default=None,gt=0)
    compare_slates:bool=False
    limit_per_profile:int=Field(default=25,ge=1,le=200)

@router.post("/campaigns/{campaign_id}/digital-reports")
def generate(campaign_id:int,payload:DigitalReportInput,session:Session=Depends(get_session)):
    return save_report(session,campaign_id,payload)

@router.get("/campaigns/{campaign_id}/digital-reports")
def reports(campaign_id:int,limit:int=Query(20,ge=1,le=100),session:Session=Depends(get_session)):
    if not session.get(Campaign,campaign_id):raise HTTPException(404,"Campanha não encontrada.")
    rows=session.exec(select(GeneratedReport).where(GeneratedReport.campaign_id==campaign_id,GeneratedReport.report_type==REPORT_TYPE).order_by(GeneratedReport.created_at.desc(),GeneratedReport.id.desc()).limit(limit)).all()
    import json
    return [{"id":r.id,"created_at":r.created_at,"status":r.status,"title":json.loads(r.structured_content)['title'],"period":json.loads(r.structured_content)['analysis']['period']} for r in rows]

@router.get("/digital-reports/{report_id}")
def detail(report_id:int,session:Session=Depends(get_session)):
    row,document=read_report(session,report_id)
    return {"id":row.id,**document}

@router.get("/digital-reports/{report_id}/images/{post_id}")
def stored_image(report_id:int,post_id:int,session:Session=Depends(get_session)):
    _,document=read_report(session,report_id)
    allowed={h['post']['post_id'] for h in document['highlights']}
    if document.get('cover'):allowed.add(document['cover']['post']['post_id'])
    if post_id not in allowed:
        raise HTTPException(404,"Imagem não pertence ao relatório.")
    cached=cache_image(post_id)
    if cached is None:raise HTTPException(404,"Imagem não disponível no cache armazenado.")
    path,mime=cached
    return FileResponse(path,media_type=mime,headers={"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"})


@router.post("/digital-reports/{report_id}/export/pdf")
async def export_pdf(report_id:int,request:Request,session:Session=Depends(get_session)):
    from starlette.concurrency import run_in_threadpool
    from app.services.report_pdf import MAX_EXPORT_BYTES,render_pdf
    read_report(session,report_id)  # Same authenticated API and saved document; no recalculation.
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "text/html":
        raise HTTPException(415, "Envie o documento HTML do relatório.")
    body=bytearray()
    async for chunk in request.stream():
        if len(body)+len(chunk)>MAX_EXPORT_BYTES:
            raise HTTPException(413, "Documento de exportação muito grande.")
        body.extend(chunk)
    pdf=await run_in_threadpool(render_pdf,bytes(body))
    return Response(pdf,media_type="application/pdf",headers={"Content-Disposition":f'attachment; filename="data-sight-relatorio-{report_id}.pdf"'})
