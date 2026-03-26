from __future__ import annotations
import re
from pathlib import Path
from typing import Any
from pypdf import PdfReader

NUMBER_RE = re.compile(r"\d{1,3}(?:\.\d{3})*,\d{2}")
PLATE_RE = re.compile(r"\b[A-Z]{3}-?\d{4}\b")
SERVICE_KEYWORDS = [
    'MAO DE OBRA', 'M?O DE OBRA', 'SERVICO', 'SERVI?O', 'SCANNER', 'RETIFICA', 'TROCA',
    'REPARO', 'RECUPERACAO', 'RECUPERA??O', 'REVISAO', 'REVIS?O', 'ELETRICA', 'EL?TRICA',
    'ELETRICO', 'EL?TRICO', 'MECANICA', 'MEC?NICA', 'MECANICO', 'MEC?NICO', 'INSTALACAO',
    'INSTALA??O', 'DIAGNOSTICO', 'DIAGN?STICO', 'MANUTENCAO', 'MANUTEN??O', 'LIMPEZA',
    'REGULAGEM', 'ALINHAMENTO', 'BALANCEAMENTO'
]
SERVICE_UNITS = {'SV', 'MO', 'HR', 'HS'}


def _to_float_br(value: str) -> float:
    value = value.strip().replace('.', '').replace(',', '.')
    try:
        return float(value)
    except Exception:
        return 0.0


def extract_text(path: str) -> str:
    file_path = Path(path)
    if file_path.suffix.lower() == '.pdf':
        reader = PdfReader(path)
        return "\n".join(page.extract_text() or '' for page in reader.pages)
    try:
        from PIL import Image
        import pytesseract
        return pytesseract.image_to_string(Image.open(path), lang='por+eng')
    except Exception:
        return ''


def parse_service_order(path: str) -> dict[str, Any]:
    text = extract_text(path)
    compact = re.sub(r'[ \t]+', ' ', text)
    order_number = _match(r'ORDEM SERVICO:?\s*(\d+)', compact)
    open_date = _match(r'ABERTA:?\s*(\d{2}/\d{2}/\d{2})', compact)
    close_date = _match(r'FECHADA:?\s*(\d{2}/\d{2}/\d{2})', compact)
    issuer_name = _first_line(text)
    issuer_cnpj = _match(r'CNPJ:?\s*([\d\./-]+)', compact)
    contractor_name = _match(r'NOME\.:\s*(.*?)\s+APELIDO\.:', compact)
    plate = _match(r'VEICULO:?\s*(' + PLATE_RE.pattern + r')', compact) or _regex_first(PLATE_RE, compact)

    vehicle_description = None
    if plate:
        m = re.search(rf'VEICULO:?\s*{re.escape(plate)}\s+(.*?)\s+KM:', compact)
        if m:
            vehicle_description = m.group(1).strip()

    observations = _match(r'OBS:?\s*(.*?)\s*-{10,}', text, flags=re.S)
    service_total = _money_after('SOMA DOS SERVICOS', compact)
    product_total = _money_after('SOMA DOS PRODUTOS', compact)
    discount = _money_after('DESCONTO', compact)
    charges = _money_after('ENCARGOS', compact)
    total_value = _money_after('TOTAL PAGAR', compact)
    items = _parse_items(text)
    confidence = _estimate_confidence(order_number, plate, items, total_value)
    requires_review = confidence < 0.88 or any(i['confidence'] < 0.85 for i in items)

    return {
        'raw_text': text,
        'order_number': order_number,
        'open_date': open_date,
        'close_date': close_date,
        'issuer_name': issuer_name,
        'issuer_cnpj': issuer_cnpj,
        'contractor_name': contractor_name,
        'vehicle_plate': plate,
        'vehicle_description': vehicle_description,
        'observations': (observations or '').strip(),
        'service_total': service_total,
        'product_total': product_total,
        'discount': discount,
        'charges': charges,
        'total_value': total_value,
        'items': items,
        'confidence': confidence,
        'requires_review': requires_review,
        'flags': _build_flags(order_number, open_date, plate, items, total_value),
    }


def _match(pattern: str, text: str, flags: int = 0):
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else None


def _regex_first(pattern, text: str):
    m = pattern.search(text)
    return m.group(0) if m else None


def _first_line(text: str):
    for line in text.splitlines():
        line = line.strip()
        if line:
            return line
    return None


def _money_after(label: str, text: str) -> float:
    m = re.search(rf'{label}.*?(\d{{1,3}}(?:\.\d{{3}})*,\d{{2}})', text)
    return _to_float_br(m.group(1)) if m else 0.0


def _parse_items(text: str):
    lines = [re.sub(r'\s+', ' ', ln).strip() for ln in text.splitlines()]
    items = []
    start = False
    for ln in lines:
        if 'DESCRICAO DOS PRODUTOS' in ln:
            start = True
            continue
        if not start or not ln or ln.startswith('FORMAS DE PAGTO') or 'SOMA DOS SERVICOS' in ln:
            continue
        if re.fullmatch(r'-{5,}', ln):
            continue

        normalized = re.sub(r'(?<=\d)([A-Z])', r' \1', ln)
        m = re.match(r'^(\d{7})\s*(.*?)\s+(\d+,\d{3}|\d+,\d+)\s*([A-Z]{1,3}/\d{3}|PC/\d{3})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})', normalized)
        if not m:
            continue
        code, desc, qty_raw, unit_raw, _gross, net_raw, total_raw = m.groups()
        description = _normalize_item_description(desc)

        items.append({
            'item_code': code,
            'description': description,
            'item_type': _infer_type(description, unit_raw),
            'quantity': _to_float_br(qty_raw),
            'unit': unit_raw.split('/')[0],
            'unit_price': _to_float_br(net_raw),
            'total_price': _to_float_br(total_raw),
            'confidence': 0.9,
            'need_evidence_count': 1,
            'done_evidence_count': 1,
            'service_execution_description': None,
            'approval_status': 'pendente',
            'approval_reason': None,
        })
    return items


def _normalize_item_description(desc: str) -> str:
    description = re.sub(r'\s+', ' ', (desc or '')).strip(' -')
    description = re.sub(r'^(?:MAO DE OBRA|M[?A]O DE OBRA)\s*[-:/]?\s*', 'Mao de obra ', description, flags=re.I)
    description = re.sub(r'^SERVICO\s*[-:/]?\s*', 'Servico ', description, flags=re.I)
    description = re.sub(r'^SERVI[C?]O\s*[-:/]?\s*', 'Servico ', description, flags=re.I)
    description = re.sub(r'\s+', ' ', description).strip()
    return description


def looks_like_service(desc: str, unit_raw: str | None = None) -> bool:
    descu = (desc or '').upper()
    unitu = (unit_raw or '').upper().split('/')[0]
    return any(keyword in descu for keyword in SERVICE_KEYWORDS) or unitu in SERVICE_UNITS


def _infer_type(desc: str, unit_raw: str | None = None) -> str:
    return 'servico' if looks_like_service(desc, unit_raw) else 'produto'


def _estimate_confidence(order_number, plate, items, total_value):
    score = 0.35
    if order_number:
        score += 0.15
    if plate:
        score += 0.15
    if items:
        score += min(0.2, len(items) * 0.03)
    if total_value > 0:
        score += 0.15
    return round(min(score, 0.99), 2)


def _build_flags(order_number, open_date, plate, items, total_value):
    flags = []
    if not order_number:
        flags.append('Número da OS não identificado com segurança.')
    if not open_date:
        flags.append('Data de abertura ausente ou ilegível.')
    if not plate:
        flags.append('Placa do veículo não encontrada.')
    if not items:
        flags.append('Nenhum item extraído; validar manualmente.')
    if total_value <= 0:
        flags.append('Total a pagar não identificado.')
    return flags
