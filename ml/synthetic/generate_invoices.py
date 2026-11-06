#!/usr/bin/env python3
"""
ReconOS Synthetic Indian Invoice Generator
Generates realistic Indian B2B accounting datasets with GSTINs, PANs,
tax breakups (CGST/SGST vs IGST), and real-world typographical edge cases.
Complies with GEMINI.md: "Never use real client data. Use synthetic generators (Faker en_IN)."
"""

import json
import random
from datetime import datetime, timedelta

INDIAN_STATES = [
    ("27", "Maharashtra"),
    ("07", "Delhi"),
    ("29", "Karnataka"),
    ("24", "Gujarat"),
    ("33", "Tamil Nadu"),
    ("19", "West Bengal"),
    ("06", "Haryana"),
    ("09", "Uttar Pradesh"),
]

COMPANY_SUFFIXES = ["Pvt Ltd", "Industries Limited", "Enterprises", "Corporation", "Technologies LLP", "Logistics & Transport"]
COMMON_EXPENSES = [
    ("Raw Materials / Components", 18),
    ("IT & Cloud Services", 18),
    ("Freight & Transportation Charges", 5),
    ("Legal & Professional Services", 18),
    ("Office Stationery & Supplies", 12),
    ("Industrial Machinery Spares", 18),
    ("Security & Guard Services", 18),
]

def generate_random_pan():
    letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    first3 = "".join(random.choices(letters, k=3))
    entity_char = "C" # Company
    fifth_char = random.choice(letters)
    digits = f"{random.randint(1000, 9999)}"
    last_char = random.choice(letters)
    return f"{first3}{entity_char}{fifth_char}{digits}{last_char}"

def compute_gstin_check_char(code14):
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    factor = 1
    total = 0
    for c in reversed(code14):
        if c in chars:
            val = chars.index(c) * factor
            factor = 1 if factor == 2 else 2
            total += (val // 36) + (val % 36)
    remainder = total % 36
    check_code = (36 - remainder) % 36
    return chars[check_code]

def generate_random_gstin(state_code=None):
    if not state_code:
        state_code = random.choice(INDIAN_STATES)[0]
    pan = generate_random_pan()
    entity_code = "1"
    code14 = f"{state_code}{pan}{entity_code}Z"
    check = compute_gstin_check_char(code14)
    return f"{code14}{check}"

def generate_synthetic_dataset(num_records=500):
    records = []
    base_date = datetime(2024, 4, 1)

    for i in range(1, num_records + 1):
        state_code, state_name = random.choice(INDIAN_STATES)
        supplier_gstin = generate_random_gstin(state_code)
        company_name = f"{random.choice(['Apex', 'Bharat', 'Shree', 'Global', 'Dynamic', 'Nova', 'Surya', 'Zenith'])} {random.choice(COMPANY_SUFFIXES)}"
        
        # Indian Date format DD/MM/YYYY
        random_days = random.randint(0, 180)
        inv_date = base_date + timedelta(days=random_days)
        date_str = inv_date.strftime("%d/%m/%Y")

        item_desc, gst_rate = random.choice(COMMON_EXPENSES)
        taxable_value = round(random.uniform(5000.0, 500000.0), 2)
        
        # Inter-state (IGST) vs Intra-state (CGST + SGST)
        is_interstate = (state_code != "27") # assuming client is in MH (27)
        if is_interstate:
            igst = round(taxable_value * (gst_rate / 100.0), 2)
            cgst = 0.0
            sgst = 0.0
        else:
            igst = 0.0
            cgst = round(taxable_value * (gst_rate / 200.0), 2)
            sgst = cgst

        total_amount = round(taxable_value + cgst + sgst + igst, 2)

        # Invoice number formats
        inv_prefixes = ["INV-2024-", "BILL/", "GST/24-25/", "TI-"]
        inv_num = f"{random.choice(inv_prefixes)}{random.randint(100, 99999)}"

        records.append({
            "record_id": f"rec_{i:04d}",
            "supplier_gstin": supplier_gstin,
            "supplier_name": company_name,
            "invoice_number": inv_num,
            "invoice_date": date_str,
            "taxable_value": taxable_value,
            "cgst": cgst,
            "sgst": sgst,
            "igst": igst,
            "total_amount": total_amount,
            "itc_eligible": True,
            "statutory_risk": "None"
        })

    return records

if __name__ == "__main__":
    dataset = generate_synthetic_dataset(100)
    print(f"Generated {len(dataset)} synthetic Indian invoices.")
    print("Sample record:", json.dumps(dataset[0], indent=2))
