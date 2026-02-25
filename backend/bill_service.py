"""
PDF Bill Generation Service for Nirbani Dairy
Generates farmer bills and collection reports
"""
import io
from datetime import datetime
from typing import List, Dict, Optional


def generate_farmer_bill_html(
    farmer: Dict,
    collections: List[Dict],
    payments: List[Dict],
    period_start: str,
    period_end: str,
    dairy_name: str = "Nirbani Dairy",
    dairy_phone: str = "",
    dairy_address: str = ""
) -> str:
    """
    Generate HTML bill for a farmer
    
    This HTML can be:
    1. Rendered in browser for printing
    2. Converted to PDF using a library like weasyprint
    3. Sent via email
    """
    
    total_milk = sum(c.get('quantity', 0) for c in collections)
    total_amount = sum(c.get('amount', 0) for c in collections)
    total_paid = sum(p.get('amount', 0) for p in payments)
    balance = total_amount - total_paid
    
    # Generate collections table rows
    collection_rows = ""
    for c in collections:
        collection_rows += f"""
        <tr>
            <td>{c.get('date', '')}</td>
            <td>{c.get('shift', '').capitalize()}</td>
            <td>{c.get('quantity', 0):.1f} L</td>
            <td>{c.get('fat', 0):.1f}%</td>
            <td>{c.get('snf', 0):.1f}%</td>
            <td>₹{c.get('rate', 0):.2f}</td>
            <td class="amount">₹{c.get('amount', 0):.2f}</td>
        </tr>
        """
    
    # Generate payments table rows
    payment_rows = ""
    for p in payments:
        payment_rows += f"""
        <tr>
            <td>{p.get('date', '')}</td>
            <td>{p.get('payment_mode', '').upper()}</td>
            <td class="amount">₹{p.get('amount', 0):.2f}</td>
            <td>{p.get('notes', '')}</td>
        </tr>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html lang="hi">
    <head>
        <meta charset="UTF-8">
        <title>किसान बिल - {farmer.get('name', '')}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700&display=swap');
            
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Mukta', sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                padding: 20px;
            }}
            
            .bill-container {{
                max-width: 800px;
                margin: 0 auto;
                border: 2px solid #047857;
                padding: 20px;
            }}
            
            .header {{
                text-align: center;
                border-bottom: 2px solid #047857;
                padding-bottom: 15px;
                margin-bottom: 15px;
            }}
            
            .header h1 {{
                color: #047857;
                font-size: 24px;
                margin-bottom: 5px;
            }}
            
            .header .tagline {{
                color: #666;
                font-size: 14px;
            }}
            
            .info-section {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                padding: 10px;
                background: #f0fdf4;
                border-radius: 5px;
            }}
            
            .info-block h3 {{
                color: #047857;
                font-size: 14px;
                margin-bottom: 5px;
            }}
            
            .info-block p {{
                font-size: 12px;
                color: #333;
            }}
            
            .section-title {{
                background: #047857;
                color: white;
                padding: 8px 15px;
                font-size: 14px;
                font-weight: 600;
                margin: 15px 0 10px 0;
            }}
            
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }}
            
            th {{
                background: #e0f2fe;
                color: #047857;
                padding: 8px;
                text-align: left;
                font-size: 11px;
                border: 1px solid #ddd;
            }}
            
            td {{
                padding: 6px 8px;
                border: 1px solid #ddd;
                font-size: 11px;
            }}
            
            tr:nth-child(even) {{
                background: #f9f9f9;
            }}
            
            .amount {{
                text-align: right;
                font-weight: 600;
            }}
            
            .summary {{
                background: #f0fdf4;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
            }}
            
            .summary-row {{
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid #ddd;
            }}
            
            .summary-row:last-child {{
                border-bottom: none;
                font-weight: 700;
                font-size: 16px;
                color: #047857;
            }}
            
            .footer {{
                text-align: center;
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #ddd;
                color: #666;
                font-size: 11px;
            }}
            
            @media print {{
                body {{
                    padding: 0;
                }}
                .bill-container {{
                    border: none;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="bill-container">
            <div class="header">
                <h1>🥛 {dairy_name}</h1>
                <p class="tagline">डेयरी प्रबंधन सॉफ्टवेयर | Dairy Management Software</p>
                {f'<p>{dairy_address}</p>' if dairy_address else ''}
                {f'<p>📞 {dairy_phone}</p>' if dairy_phone else ''}
            </div>
            
            <div class="info-section">
                <div class="info-block">
                    <h3>किसान विवरण / Farmer Details</h3>
                    <p><strong>नाम:</strong> {farmer.get('name', '')}</p>
                    <p><strong>फ़ोन:</strong> {farmer.get('phone', '')}</p>
                    <p><strong>गाँव:</strong> {farmer.get('village', '')}</p>
                </div>
                <div class="info-block">
                    <h3>बिल अवधि / Bill Period</h3>
                    <p><strong>From:</strong> {period_start}</p>
                    <p><strong>To:</strong> {period_end}</p>
                    <p><strong>Date:</strong> {datetime.now().strftime('%d-%m-%Y')}</p>
                </div>
            </div>
            
            <div class="section-title">दूध संग्रह / Milk Collections</div>
            <table>
                <thead>
                    <tr>
                        <th>तारीख</th>
                        <th>पाली</th>
                        <th>मात्रा</th>
                        <th>फैट</th>
                        <th>SNF</th>
                        <th>दर</th>
                        <th>राशि</th>
                    </tr>
                </thead>
                <tbody>
                    {collection_rows if collection_rows else '<tr><td colspan="7" style="text-align:center">कोई संग्रह नहीं</td></tr>'}
                </tbody>
            </table>
            
            <div class="section-title">भुगतान / Payments</div>
            <table>
                <thead>
                    <tr>
                        <th>तारीख</th>
                        <th>माध्यम</th>
                        <th>राशि</th>
                        <th>टिप्पणी</th>
                    </tr>
                </thead>
                <tbody>
                    {payment_rows if payment_rows else '<tr><td colspan="4" style="text-align:center">कोई भुगतान नहीं</td></tr>'}
                </tbody>
            </table>
            
            <div class="summary">
                <div class="summary-row">
                    <span>कुल दूध / Total Milk:</span>
                    <span>{total_milk:.1f} L</span>
                </div>
                <div class="summary-row">
                    <span>कुल राशि / Total Amount:</span>
                    <span>₹{total_amount:.2f}</span>
                </div>
                <div class="summary-row">
                    <span>कुल भुगतान / Total Paid:</span>
                    <span>₹{total_paid:.2f}</span>
                </div>
                <div class="summary-row">
                    <span>बकाया / Balance:</span>
                    <span>₹{balance:.2f}</span>
                </div>
            </div>
            
            <div class="footer">
                <p>यह एक कंप्यूटर जनित बिल है | This is a computer generated bill</p>
                <p>Generated by {dairy_name} on {datetime.now().strftime('%d-%m-%Y %H:%M')}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html


def generate_daily_report_html(
    date: str,
    collections: List[Dict],
    payments: List[Dict],
    summary: Dict,
    dairy_name: str = "Nirbani Dairy"
) -> str:
    """Generate HTML daily report"""
    
    collection_rows = ""
    for c in collections:
        collection_rows += f"""
        <tr>
            <td>{c.get('farmer_name', '')}</td>
            <td>{c.get('shift', '').capitalize()}</td>
            <td>{c.get('quantity', 0):.1f} L</td>
            <td>{c.get('fat', 0):.1f}%</td>
            <td>{c.get('snf', 0):.1f}%</td>
            <td>₹{c.get('rate', 0):.2f}</td>
            <td class="amount">₹{c.get('amount', 0):.2f}</td>
        </tr>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html lang="hi">
    <head>
        <meta charset="UTF-8">
        <title>दैनिक रिपोर्ट - {date}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700&display=swap');
            
            body {{
                font-family: 'Mukta', sans-serif;
                font-size: 12px;
                padding: 20px;
                max-width: 900px;
                margin: 0 auto;
            }}
            
            .header {{
                text-align: center;
                border-bottom: 2px solid #047857;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }}
            
            .header h1 {{
                color: #047857;
                margin-bottom: 5px;
            }}
            
            .stats-grid {{
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }}
            
            .stat-card {{
                background: #f0fdf4;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
            }}
            
            .stat-card h3 {{
                font-size: 24px;
                color: #047857;
            }}
            
            .stat-card p {{
                color: #666;
                font-size: 12px;
            }}
            
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }}
            
            th {{
                background: #047857;
                color: white;
                padding: 10px;
                text-align: left;
            }}
            
            td {{
                padding: 8px 10px;
                border-bottom: 1px solid #ddd;
            }}
            
            .amount {{
                text-align: right;
                font-weight: 600;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🥛 {dairy_name}</h1>
            <h2>दैनिक रिपोर्ट / Daily Report</h2>
            <p>तारीख: {date}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>{summary.get('total_quantity', 0):.1f} L</h3>
                <p>कुल दूध</p>
            </div>
            <div class="stat-card">
                <h3>₹{summary.get('total_amount', 0):.0f}</h3>
                <p>कुल राशि</p>
            </div>
            <div class="stat-card">
                <h3>{summary.get('morning_quantity', 0):.1f} L</h3>
                <p>सुबह</p>
            </div>
            <div class="stat-card">
                <h3>{summary.get('evening_quantity', 0):.1f} L</h3>
                <p>शाम</p>
            </div>
        </div>
        
        <h3>संग्रह विवरण / Collection Details</h3>
        <table>
            <thead>
                <tr>
                    <th>किसान</th>
                    <th>पाली</th>
                    <th>मात्रा</th>
                    <th>फैट</th>
                    <th>SNF</th>
                    <th>दर</th>
                    <th>राशि</th>
                </tr>
            </thead>
            <tbody>
                {collection_rows if collection_rows else '<tr><td colspan="7" style="text-align:center">कोई संग्रह नहीं</td></tr>'}
            </tbody>
        </table>
        
        <div style="text-align:center; margin-top:30px; color:#666; font-size:11px;">
            Generated on {datetime.now().strftime('%d-%m-%Y %H:%M')}
        </div>
    </body>
    </html>
    """
    
    return html
