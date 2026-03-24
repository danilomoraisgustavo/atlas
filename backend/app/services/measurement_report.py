from pathlib import Path
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _currency(value: float) -> str:
    return f"R$ {value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')


def build_measurement_pdf(output_path: str, title: str, rows: list[dict], total_value: float):
    styles = getSampleStyleSheet()
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=colors.HexColor('#12344d'),
        spaceAfter=8,
    )
    muted = ParagraphStyle(
        'Muted',
        parent=styles['BodyText'],
        fontSize=9,
        textColor=colors.HexColor('#4b5563'),
        leading=12,
    )

    doc = SimpleDocTemplate(output_path, pagesize=A4, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    story = [
        Paragraph(title, styles['Title']),
        Paragraph(f'Gerado em {datetime.now().strftime("%d/%m/%Y %H:%M")}', styles['Normal']),
        Spacer(1, 16),
    ]

    data = [['OS', 'Veículo', 'Fornecedor', 'Situação', 'Valor Total']]
    for row in rows:
      data.append([row['order_number'], row['vehicle_plate'], row['supplier_name'], row['status'], _currency(row['total_value'])])
    data.append(['', '', '', 'Total', _currency(total_value)])

    table = Table(data, colWidths=[70, 75, 150, 90, 100])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#12344d')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (4, 1), (4, -1), 'RIGHT'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e2e8f0')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    story.extend([table, Spacer(1, 20)])

    for row in rows:
        story.append(Paragraph(f"OS {row['order_number']} • {row['vehicle_plate']}", section_title))
        summary_html = (
            f"<b>Fornecedor:</b> {row['supplier_name']}<br/>"
            f"<b>Status:</b> {row['status']}<br/>"
            f"<b>Total:</b> {_currency(row['total_value'])}<br/>"
            f"<b>Previsão informada:</b> {row.get('estimated_completion') or 'Não informada'}"
        )
        story.append(Paragraph(summary_html, muted))
        story.append(Spacer(1, 8))

        evidence_files = row.get('evidence_files') or []
        if evidence_files:
            story.append(Paragraph('Evidências anexadas', styles['Heading4']))
            image_flowables = []
            for evidence_path in evidence_files[:4]:
                local_path = Path(evidence_path)
                if local_path.exists() and local_path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp'}:
                    image_flowables.append(Image(str(local_path), width=5.1 * cm, height=3.6 * cm))
            if image_flowables:
                images_table = Table([image_flowables[i:i + 2] for i in range(0, len(image_flowables), 2)], colWidths=[6 * cm, 6 * cm])
                images_table.setStyle(TableStyle([('BOTTOMPADDING', (0, 0), (-1, -1), 10)]))
                story.append(images_table)
            story.append(Paragraph(f"Arquivos vinculados: {', '.join(row.get('evidence_names') or [])}", muted))
        else:
            story.append(Paragraph('Sem evidências visuais anexadas ao boletim.', muted))

        story.append(Spacer(1, 18))

    doc.build(story)
