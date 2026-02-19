"""
PDF generation service for renovation quotes using ReportLab.
Produces professional Japanese-style quote documents.
"""
import io
from datetime import datetime
from typing import TYPE_CHECKING

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

if TYPE_CHECKING:
    import models


def _register_fonts():
    try:
        pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))
        return "HeiseiKakuGo-W5"
    except Exception:
        return "Helvetica"


def _fmt_currency(v: float) -> str:
    return f"¥{int(v):,}"


def _fmt_num(v: float) -> str:
    if v == int(v):
        return f"{int(v):,}"
    return f"{v:,.1f}"


def generate_quote_pdf(quote: "models.Quote") -> bytes:
    font = _register_fonts()
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    W = A4[0] - 36 * mm  # usable width

    styles = getSampleStyleSheet()
    normal = ParagraphStyle("JpNormal", fontName=font, fontSize=9, leading=14)
    small = ParagraphStyle("JpSmall", fontName=font, fontSize=8, leading=11, textColor=colors.grey)
    heading = ParagraphStyle("JpHeading", fontName=font, fontSize=11, leading=16, spaceAfter=4)
    title_style = ParagraphStyle("JpTitle", fontName=font, fontSize=18, leading=22, spaceAfter=6)
    right_style = ParagraphStyle("JpRight", fontName=font, fontSize=9, leading=13, alignment=2)

    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    # Company block (right) + Title (left) using a 2-col table
    company_lines = [
        Paragraph("<b>湧水堂リフォーム株式会社</b>", heading),
        Paragraph("〒000-0000 東京都渋谷区〇〇1-2-3", small),
        Paragraph("TEL: 03-0000-0000　FAX: 03-0000-0001", small),
    ]
    title_lines = [
        Paragraph("見　積　書", title_style),
        Paragraph(f"見積番号：{quote.quote_number or '---'}", normal),
        Paragraph(f"作成日：{datetime.now().strftime('%Y年%m月%d日')}", normal),
    ]

    header_table = Table(
        [[title_lines, company_lines]],
        colWidths=[W * 0.55, W * 0.45],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a5f")))
    story.append(Spacer(1, 4 * mm))

    # ── Customer / Meta info ─────────────────────────────────────────────────
    customer = quote.customer
    staff = quote.staff
    cust_name = customer.name if customer else "---"
    cust_contact = customer.contact_person if customer else ""
    staff_name = staff.name if staff else "---"
    valid = quote.valid_until.strftime("%Y年%m月%d日") if quote.valid_until else "---"

    meta_data = [
        [Paragraph(f"<b>宛先：　{cust_name}　{cust_contact}　御中</b>", heading),
         Paragraph(f"担当：{staff_name}", right_style)],
        [Paragraph(f"件名：{quote.title}", normal),
         Paragraph(f"有効期限：{valid}", right_style)],
    ]
    meta_table = Table(meta_data, colWidths=[W * 0.65, W * 0.35])
    meta_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6 * mm))

    # ── Summary box ──────────────────────────────────────────────────────────
    subtotal = quote.subtotal
    discount = quote.discount_amount or 0
    total = quote.total_amount
    tax = total * 0.10

    summary_data = [
        ["合計金額（税込）", _fmt_currency(total * 1.1)],
        ["税抜合計", _fmt_currency(total)],
        ["消費税（10%）", _fmt_currency(tax)],
        ["値引き", _fmt_currency(-discount)] if discount else None,
        ["小計", _fmt_currency(subtotal)],
    ]
    summary_data = [r for r in summary_data if r]

    summary_table = Table(summary_data, colWidths=[W * 0.4, W * 0.25])
    summary_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, 0), 11),
        ("FONTNAME", (0, 0), (-1, 0), font),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
        ("GRID", (0, 1), (-1, -1), 0.3, colors.lightgrey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f7fa")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 8 * mm))

    # ── Line items table ──────────────────────────────────────────────────────
    col_widths = [W * 0.35, W * 0.12, W * 0.07, W * 0.07, W * 0.13, W * 0.13, W * 0.13]
    headers = ["品名・工事名", "メーカー/型番", "数量", "単位", "販売単価", "施工費", "小計"]

    table_data = [headers]
    HEADER_COLOR = colors.HexColor("#1e3a5f")
    ROW_COLORS = [colors.white, colors.HexColor("#f0f4f8")]

    for item in quote.items:
        name_text = item.name
        if item.manufacturer:
            name_text += f"\n{item.manufacturer}"
        if item.model_number:
            name_text += f" {item.model_number}"

        row = [
            Paragraph(name_text, normal),
            Paragraph(f"{item.manufacturer or ''}\n{item.model_number or ''}", small),
            _fmt_num(item.quantity),
            item.unit,
            _fmt_currency(item.unit_price),
            _fmt_currency(item.construction_cost),
            _fmt_currency(item.subtotal),
        ]
        table_data.append(row)

        # Options as sub-rows
        for opt in (item.selected_options or []):
            opt_name = opt.get("name", "") if isinstance(opt, dict) else opt.name
            opt_price = opt.get("unit_price", 0) if isinstance(opt, dict) else opt.unit_price
            opt_qty = opt.get("quantity", 1) if isinstance(opt, dict) else opt.quantity
            table_data.append([
                Paragraph(f"　└ {opt_name}", small),
                "",
                _fmt_num(opt_qty),
                "式",
                _fmt_currency(opt_price),
                "",
                _fmt_currency(opt_price * opt_qty),
            ])

    items_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    row_count = len(table_data)
    items_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_COLOR),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), font),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), ROW_COLORS),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#1e3a5f")),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 6 * mm))

    # ── Notes ────────────────────────────────────────────────────────────────
    if quote.notes:
        story.append(Paragraph("<b>備考</b>", normal))
        story.append(Paragraph(quote.notes.replace("\n", "<br/>"), normal))
        story.append(Spacer(1, 4 * mm))

    # ── Footer ───────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        "※ 本見積書の有効期限内にご発注ください。　※ 価格は全て税抜き表示です。",
        small
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()
