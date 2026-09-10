from __future__ import annotations

import re
import unicodedata


THEME_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Segurança": ("seguranca", "policia", "crime", "violencia", "delegacia"),
    "Infraestrutura": ("obra", "buraco", "asfalto", "paviment", "iluminacao", "infraestrutura"),
    "Transporte/Mobilidade": ("onibus", "transporte", "mobilidade", "brt", "metro", "transito", "ciclovia"),
    "Saúde": ("saude", "hospital", "ubs", "medic", "vacina", "atendimento"),
    "Educação": ("educacao", "escola", "creche", "professor", "aluno", "ensino"),
    "Agro/Rural": ("agro", "rural", "agricult", "produtor", "colheita", "pecuaria"),
    "Emprego/Renda": ("emprego", "trabalho", "renda", "qualificacao", "economia", "feirante"),
    "Política": ("eleicao", "campanha", "deputado", "mandato", "governo", "politica", "vote"),
    "Eventos/Cultura": ("evento", "cultura", "festival", "show", "festa", "feira"),
    "Lazer": ("lazer", "esporte", "parque", "quadra", "futebol"),
    "Meio Ambiente": ("meio ambiente", "ambiental", "cerrado", "lixo", "reciclag", "agua"),
    "Comunidade/Cotidiano": ("comunidade", "morador", "bairro", "cotidiano", "visita"),
    "Serviços Públicos": ("servico publico", "secretaria", "atendimento", "fiscalizacao", "administracao regional"),
}


def normalize_text(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", text)


def classify_theme(caption: str | None) -> tuple[str, float]:
    """Classifica exclusivamente o conteúdo textual e retorna tema/confiança explicável."""
    text = normalize_text(caption)
    if not text:
        return "Outros", 0.0
    scores = {theme: sum(1 for keyword in keywords if keyword in text) for theme, keywords in THEME_KEYWORDS.items()}
    theme, hits = max(scores.items(), key=lambda item: item[1])
    return (theme, min(1.0, 0.55 + (hits - 1) * 0.15)) if hits else ("Outros", 0.2)


def theme_names() -> list[str]:
    return [*THEME_KEYWORDS, "Outros"]
