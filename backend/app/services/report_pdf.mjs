// Offline renderer: never navigates to an application URL or evaluates document scripts.
import {chromium} from '@playwright/test'
let html=''
for await(const chunk of process.stdin){html+=chunk;if(Buffer.byteLength(html)>16*1024*1024)throw new Error('Export too large')}
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({javaScriptEnabled:false,offline:true,serviceWorkers:'block',viewport:{width:1100,height:1000}})
 await context.route('**/*',route=>route.abort())
 const page=await context.newPage()
 page.setDefaultTimeout(20000)
 // First policy cannot be relaxed by later markup, even if a caller submits custom HTML.
 const policy=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'">`
 await page.setContent(policy+html,{waitUntil:'load',timeout:20000})
 await page.emulateMedia({media:'print'})
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})))})
 const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,timeout:30000})
 process.stdout.write(pdf)
}finally{await browser.close()}
