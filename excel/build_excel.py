"""Generate the Excel edition of the Gita Gangsa business management system.

    python3 excel/build_excel.py            -> excel/SistemGitaGangsa.xlsx (empty, ready to use)
                                              excel/SistemGitaGangsa-Contoh.xlsx (with example data)

The workbook uses only functions that work in Excel 2010+, Excel for Android/iOS and
Google Sheets (no macros, no XLOOKUP/FILTER/LET). Every computed value is a live formula.
"""
from pathlib import Path
from datetime import date, time

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.drawing.image import Image as XLImage
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / 'server' / 'assets' / 'default-logo.jpg'
OUT_DIR = ROOT / 'excel'

FIRST = 5  # first data row on every table sheet (row 4 = headers)
ROWS = {'Pelanggan': 500, 'Servis': 200, 'Tempahan': 500, 'Sebut Harga': 500, 'Invois': 500, 'Item': 2500, 'Bayaran': 1000}

# ---------------------------------------------------------------- styles
FONT = 'Arial'
GOLD = '9A6B1F'
F_BASE = Font(name=FONT, size=10)
F_INPUT = Font(name=FONT, size=10, color='0000FF')
F_OVER = Font(name=FONT, size=10, color='1F6F5F')
F_AUTO = Font(name=FONT, size=10, color='000000')
F_HEAD = Font(name=FONT, size=10, bold=True, color='000000')
F_TITLE = Font(name=FONT, size=16, bold=True, color=GOLD)
F_NOTE = Font(name=FONT, size=9, italic=True, color='595959')
FILL_IN_HEAD = PatternFill('solid', fgColor='F6E7C8')
FILL_OVER_HEAD = PatternFill('solid', fgColor='DDEFEA')
FILL_AUTO_HEAD = PatternFill('solid', fgColor='D9D9D9')
FILL_AUTO = PatternFill('solid', fgColor='F2F2F2')
FILL_OVER = PatternFill('solid', fgColor='F1F8F6')
FILL_YELLOW = PatternFill('solid', fgColor='FFF2CC')
THIN = Side(style='thin', color='BFBFBF')
BLACK = Side(style='thin', color='000000')
MED = Side(style='medium', color='000000')
B_ALL = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
RM = '"RM" #,##0.00'
NUM2 = '#,##0.00'
DATE_FMT = 'dd/mm/yyyy'
TIME_FMT = 'h:mm AM/PM'
TEXT = '@'

LEGEND = ('Kuning/biru = isi sendiri  •  Hijau = diisi automatik, boleh ditulis ganti  •  Kelabu = automatik, jangan ubah. '
          'Jangan padam baris: untuk membatalkan, gunakan lajur "Batal" / "Tindakan".')

BOOKING_STATUSES = ['Pertanyaan Baharu', 'Menunggu Sebut Harga', 'Sebut Harga Dihantar', 'Menunggu Pengesahan', 'Disahkan',
                    'Deposit Dibayar', 'Dibayar Penuh', 'Selesai', 'Dibatalkan']
MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']


def ms_words(n):
    units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan']
    if n == 0:
        return 'kosong'
    parts = []
    h, rest = divmod(n, 100)
    if h:
        parts.append('seratus' if h == 1 else f'{units[h]} ratus')
    if rest >= 20:
        parts.append(f'{units[rest // 10]} puluh')
        if rest % 10:
            parts.append(units[rest % 10])
    elif rest >= 11:
        parts.append('sebelas' if rest == 11 else f'{units[rest - 10]} belas')
    elif rest == 10:
        parts.append('sepuluh')
    elif rest:
        parts.append(units[rest])
    return ' '.join(parts)


# ---------------------------------------------------------------- helpers
class Book:
    def __init__(self):
        self.wb = Workbook()
        self.wb.remove(self.wb.active)
        # Arial everywhere, including cells without an explicit font
        normal = next(st for st in self.wb._named_styles if st.name == 'Normal')
        normal.font = Font(name=FONT, size=10)
        self.cols = {}  # sheet -> {key: letter}

    def name(self, name, ref):
        self.wb.defined_names[name] = DefinedName(name, attr_text=ref)

    def col_range(self, sheet, key):
        letter = self.cols[sheet][key]
        last = FIRST + ROWS[sheet] - 1
        return f"'{sheet}'!${letter}${FIRST}:${letter}${last}"


def title(ws, text, note=LEGEND):
    ws['A1'] = text
    ws['A1'].font = F_TITLE
    ws['A2'] = note
    ws['A2'].font = F_NOTE
    ws.row_dimensions[1].height = 24


def table_sheet(book, name, columns, tab_color=None):
    """columns: list of dicts(key, head, width, kind in|over|auto|helper, f (formula with {r} and [key]), fmt, hint, dv, wrap)."""
    ws = book.wb.create_sheet(name)
    if tab_color:
        ws.sheet_properties.tabColor = tab_color
    letters = {c['key']: get_column_letter(i + 1) for i, c in enumerate(columns)}
    book.cols[name] = letters
    n = ROWS[name]
    last = FIRST + n - 1
    for i, c in enumerate(columns):
        L = letters[c['key']]
        ws.column_dimensions[L].width = c.get('width', 14)
        kind = c.get('kind', 'in')
        h = ws[f'{L}4']
        h.value = c['head'] + (' (auto)' if kind == 'auto' else '')
        h.font = F_HEAD
        h.fill = {'in': FILL_IN_HEAD, 'over': FILL_OVER_HEAD}.get(kind, FILL_AUTO_HEAD)
        h.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
        h.border = B_ALL
        if c.get('hint'):
            ws[f'{L}3'] = c['hint']
            ws[f'{L}3'].font = F_NOTE
            ws[f'{L}3'].alignment = Alignment(wrap_text=True, vertical='top')
        if kind == 'helper':
            ws.column_dimensions[L].hidden = True
    ws.row_dimensions[3].height = 30
    ws.row_dimensions[4].height = 32

    def resolve(formula, r):
        out = formula.replace('{r}', str(r))
        for k, L in letters.items():
            out = out.replace(f'[{k}]', f'{L}{r}')
        return out

    for r in range(FIRST, last + 1):
        for c in columns:
            L = letters[c['key']]
            cell = ws[f'{L}{r}']
            kind = c.get('kind', 'in')
            if c.get('f'):
                cell.value = resolve(c['f'], r)
            cell.font = {'in': F_INPUT, 'over': F_OVER}.get(kind, F_AUTO)
            if kind in ('auto', 'helper'):
                cell.fill = FILL_AUTO
            elif kind == 'over':
                cell.fill = FILL_OVER
            if c.get('fmt'):
                cell.number_format = c['fmt']
            if c.get('wrap'):
                cell.alignment = Alignment(wrap_text=True, vertical='top')
    for c in columns:
        if c.get('dv'):
            L = letters[c['key']]
            dv = DataValidation(type='list', formula1=f"={c['dv']}", allow_blank=True, showErrorMessage=not c.get('free', False))
            if c.get('free'):
                dv.showErrorMessage = False
            dv.add(f'{L}{FIRST}:{L}{last}')
            ws.add_data_validation(dv)
        if c.get('money_dv'):
            L = letters[c['key']]
            dv = DataValidation(type='decimal', operator='greaterThanOrEqual', formula1='0', allow_blank=True,
                                error='Masukkan amaun dalam RM (nombor 0 atau lebih).', errorTitle='Amaun tidak sah', showErrorMessage=True)
            dv.add(f'{L}{FIRST}:{L}{last}')
            ws.add_data_validation(dv)
    ws.freeze_panes = f'C{FIRST}'
    ws.auto_filter.ref = f'A4:{get_column_letter(len(columns))}{last}'
    title(ws, name.upper())
    # Register a defined name for every column: e.g. T_Tarikh
    return ws


def status_colors(ws, rng, mapping):
    first = rng.split(':')[0]
    for text_value, (fg, bg, bold) in mapping.items():
        ws.conditional_formatting.add(
            rng, FormulaRule(formula=[f'{first}="{text_value}"'], font=Font(color=fg, bold=bold), fill=PatternFill('solid', fgColor=bg))
        )


STATUS_STYLE = {
    'Dibatalkan': ('9C0006', 'FFC7CE', False),
    'Tertunggak': ('9C0006', 'FFC7CE', True),
    'Dibayar': ('006100', 'C6EFCE', True),
    'Dibayar Penuh': ('006100', 'C6EFCE', True),
    'Selesai': ('006100', 'C6EFCE', False),
    'Diluluskan': ('006100', 'C6EFCE', True),
    'Deposit Dibayar': ('1F4E78', 'DDEBF7', True),
    'Dibayar Separa': ('7F6000', 'FFEB9C', True),
    'Disahkan': ('1F4E78', 'DDEBF7', False),
    'Tamat Tempoh': ('843C0C', 'FCE4D6', False),
    'Ditolak': ('9C0006', 'FFC7CE', False),
}


# ---------------------------------------------------------------- build
def build(example=False):
    book = Book()
    wb = book.wb

    # ---------------- Panduan (filled at the end, but created first so it is the first tab)
    guide = wb.create_sheet('Panduan')
    dash = wb.create_sheet('Papan Pemuka')

    # ---------------- Pelanggan
    P = 'Pelanggan'
    table_sheet(book, P, [
        dict(key='id', head='ID Pelanggan', width=13, kind='auto',
             f='=IF([nama]="","",Awalan_Pelanggan&TEXT(Mula_Pelanggan+ROW()-5,"0000"))'),
        dict(key='nama', head='Nama pelanggan *', width=28, hint='cth: Puan Annie (nama mesti unik)'),
        dict(key='syarikat', head='Syarikat / Organisasi', width=24),
        dict(key='hubungi', head='Orang untuk dihubungi', width=20),
        dict(key='tel', head='No. telefon', width=15, fmt=TEXT, hint='cth: 012-345 6789'),
        dict(key='emel', head='E-mel', width=24),
        dict(key='alamat', head='Alamat bil', width=32, wrap=True),
        dict(key='lokasi', head='Lokasi acara', width=24, wrap=True),
        dict(key='kategori', head='Kategori', width=16, dv='L_Kategori'),
        dict(key='catatan', head='Catatan', width=24, wrap=True),
        dict(key='bil', head='Tempahan', width=11, kind='auto', f='=IF([id]="","",COUNTIF(T_Pelanggan,[nama]))'),
        dict(key='invois', head='Jumlah invois', width=14, kind='auto', fmt=RM,
             f='=IF([id]="","",SUMIFS(INV_Jumlah,INV_Pelanggan,[nama],INV_Status,"<>Dibatalkan"))'),
        dict(key='bayar', head='Dibayar', width=14, kind='auto', fmt=RM,
             f='=IF([id]="","",SUMIFS(INV_Dibayar,INV_Pelanggan,[nama],INV_Status,"<>Dibatalkan"))'),
        dict(key='baki', head='Tertunggak', width=14, kind='auto', fmt=RM,
             f='=IF([id]="","",SUMIFS(INV_Baki,INV_Pelanggan,[nama],INV_Status,"<>Dibatalkan",INV_Baki,">0"))'),
        dict(key='semak', head='Semakan', width=18, kind='auto',
             f=f'=IF([nama]="","",IF(COUNTIF($B${FIRST}:$B${FIRST + ROWS[P] - 1},[nama])>1,"⚠ Nama berulang",""))'),
    ], tab_color='70AD47')

    # ---------------- Servis
    S = 'Servis'
    table_sheet(book, S, [
        dict(key='nama', head='Nama servis / pakej *', width=36, hint='cth: Perkhidmatan Gamelan (6 Pemain)'),
        dict(key='ket', head='Keterangan', width=40, wrap=True),
        dict(key='unit', head='Unit', width=10, hint='cth: pakej / jam'),
        dict(key='harga', head='Harga (RM)', width=14, fmt=RM, money_dv=True),
    ], tab_color='A5A5A5')

    # ---------------- Tempahan
    T = 'Tempahan'
    last_t = FIRST + ROWS[T] - 1
    overlap = (
        '=IF([no]="","",IF(AND([mula]<>"",[tamat]<>"",[tamat]<=[mula]),"⚠ Masa tamat sebelum mula",'
        'IF(OR([tarikh]="",[tindakan]="Dibatalkan"),"",'
        f'IF(SUMPRODUCT(($A${FIRST}:$A${last_t}<>"")*($F${FIRST}:$F${last_t}=[tarikh])*($O${FIRST}:$O${last_t}<>"Dibatalkan")'
        f'*($G${FIRST}:$G${last_t}<IF([tamat]="",1,[tamat]))*(IF([mula]="",0,[mula])<$H${FIRST}:$H${last_t}+($H${FIRST}:$H${last_t}="")))>1,'
        '"⚠ Bertindih dengan tempahan lain",""))))'
    )
    status_t = (
        '=IF([no]="","",IF([tindakan]="Dibatalkan","Dibatalkan",IF([tindakan]="Selesai","Selesai",'
        'IF(AND([invois]>0,[bayar]>=[invois]),"Dibayar Penuh",IF([bayar]>0,"Deposit Dibayar",'
        'IF(OR([tindakan]="Disahkan",[invois]>0,COUNTIFS(SH_Tempahan,[no],SH_Status,"Diluluskan")>0),"Disahkan",'
        'IF(COUNTIFS(SH_Tempahan,[no],SH_Status,"Dilihat")>0,"Menunggu Pengesahan",'
        'IF(COUNTIFS(SH_Tempahan,[no],SH_Status,"Dihantar")>0,"Sebut Harga Dihantar",'
        'IF(COUNTIF(SH_Tempahan,[no])>0,"Menunggu Sebut Harga","Pertanyaan Baharu")))))))))'
    )
    table_sheet(book, T, [
        dict(key='no', head='No. Tempahan', width=13, kind='auto',
             f='=IF([pelanggan]="","",Awalan_Tempahan&TEXT(Mula_Tempahan+ROW()-5,"0000"))'),
        dict(key='rekod', head='Tarikh direkod', width=12, fmt=DATE_FMT, hint='cth: 03/02/2026'),
        dict(key='pelanggan', head='Pelanggan *', width=24, dv='P_Nama', hint='Pilih dari senarai Pelanggan'),
        dict(key='acara', head='Nama acara *', width=28, hint='cth: Majlis Perkahwinan'),
        dict(key='jenis', head='Jenis acara', width=18, dv='L_JenisAcara'),
        dict(key='tarikh', head='Tarikh acara *', width=12, fmt=DATE_FMT, hint='cth: 16/08/2026'),
        dict(key='mula', head='Masa mula', width=10, fmt=TIME_FMT, hint='cth: 11:00 AM'),
        dict(key='tamat', head='Masa tamat', width=10, fmt=TIME_FMT),
        dict(key='tempat', head='Tempat', width=24),
        dict(key='alamat', head='Alamat penuh acara', width=30, wrap=True),
        dict(key='pakej', head='Pakej / servis', width=30, dv='SV_Nama', free=True),
        dict(key='pax', head='Bil. pemain / peserta', width=11),
        dict(key='khas', head='Keperluan khas', width=26, wrap=True),
        dict(key='dalaman', head='Catatan dalaman', width=24, wrap=True),
        dict(key='tindakan', head='Tindakan', width=13, dv='L_Tindakan', hint='Disahkan / Selesai / Dibatalkan'),
        dict(key='sebab', head='Sebab batal', width=20),
        dict(key='status', head='Status', width=21, kind='auto', f=status_t),
        dict(key='invois', head='Nilai invois', width=13, kind='auto', fmt=RM,
             f='=IF([no]="","",SUMIFS(INV_Jumlah,INV_Tempahan,[no],INV_Status,"<>Dibatalkan"))'),
        dict(key='bayar', head='Dibayar', width=13, kind='auto', fmt=RM,
             f='=IF([no]="","",SUMIFS(INV_Dibayar,INV_Tempahan,[no],INV_Status,"<>Dibatalkan"))'),
        dict(key='baki', head='Baki', width=13, kind='auto', fmt=RM, f='=IF([no]="","",[invois]-[bayar])'),
        dict(key='amaran', head='Amaran', width=26, kind='auto', f=overlap),
        dict(key='kunci_datang', head='kunci akan datang', kind='helper',
             f='=IF(AND([no]<>"",[tarikh]<>""),IF(AND([tarikh]>=TODAY(),[status]<>"Dibatalkan",[status]<>"Selesai"),[tarikh]+ROW()/100000,""),"")'),
        dict(key='kunci_tarikh', head='kunci tarikh', kind='helper',
             f='=IF(AND([no]<>"",[status]<>"Dibatalkan"),[tarikh],"")'),
    ], tab_color='4472C4')

    # ---------------- Sebut Harga
    Q = 'Sebut Harga'

    def from_booking(field):
        return f'=IF([tempahan]="","",IFERROR(INDEX({field},MATCH([tempahan],T_No,0))&"",""))'

    table_sheet(book, Q, [
        dict(key='no', head='No. Sebut Harga', width=14, kind='auto',
             f='=IF([pelanggan]="","",Awalan_SH&TEXT(Mula_SH+ROW()-5,"0000"))'),
        dict(key='tarikh', head='Tarikh *', width=12, fmt=DATE_FMT, hint='cth: 15/01/2026'),
        dict(key='tempahan', head='No. Tempahan', width=13, dv='T_No', hint='Pilih tempahan (pelanggan & acara diisi sendiri)'),
        dict(key='pelanggan_in', head='Pelanggan', width=22, dv='P_Nama', hint='Isi hanya jika tiada tempahan'),
        dict(key='pelanggan', head='Pelanggan', width=22, kind='auto',
             f='=IF([pelanggan_in]<>"",[pelanggan_in],IF([tempahan]="","",IFERROR(INDEX(T_Pelanggan,MATCH([tempahan],T_No,0))&"","")))'),
        dict(key='sah', head='Sah sehingga', width=12, kind='over', fmt=DATE_FMT, f='=IF([tarikh]="","",[tarikh]+TempohSah)'),
        dict(key='acara', head='Nama acara', width=24, kind='over', f=from_booking('T_Acara')),
        dict(key='tarikh_acara', head='Tarikh majlis', width=12, kind='over', fmt=DATE_FMT,
             f='=IF([tempahan]="","",IFERROR(INDEX(T_Tarikh,MATCH([tempahan],T_No,0)),""))'),
        dict(key='tempat', head='Tempat', width=22, kind='over', f=from_booking('T_Tempat')),
        dict(key='diskaun', head='Diskaun (RM)', width=12, fmt=RM, money_dv=True),
        dict(key='caj', head='Caj tambahan (RM)', width=12, fmt=RM, money_dv=True),
        dict(key='label', head='Label caj tambahan', width=18, hint='cth: Pengangkutan'),
        dict(key='cukai', head='Cukai (SST) %', width=10, fmt='0%', hint='cth: 8% (kosong = tiada)'),
        dict(key='pilih', head='Status', width=12, dv='L_StatusSH', hint='Draf / Dihantar / Dilihat / Diluluskan / Ditolak'),
        dict(key='kecil', head='Jumlah kecil', width=13, kind='auto', fmt=RM, f='=IF([no]="","",SUMIFS(IT_Jumlah,IT_Dok,[no]))'),
        dict(key='nilai_cukai', head='Cukai (RM)', width=12, kind='auto', fmt=RM,
             f='=IF([no]="","",ROUND(([kecil]-N([diskaun])+N([caj]))*N([cukai]),2))'),
        dict(key='jumlah', head='Jumlah besar', width=14, kind='auto', fmt=RM,
             f='=IF([no]="","",[kecil]-N([diskaun])+N([caj])+[nilai_cukai])'),
        dict(key='status', head='Status', width=14, kind='auto',
             f='=IF([no]="","",IF(AND(OR([pilih]="Dihantar",[pilih]="Dilihat"),[sah]<>"",[sah]<TODAY()),"Tamat Tempoh",IF([pilih]="","Draf",[pilih])))'),
        dict(key='invois', head='No. Invois', width=12, kind='auto', f='=IF([no]="","",IFERROR(INDEX(INV_No,MATCH([no],INV_SH,0))&"",""))'),
    ], tab_color='ED7D31')

    # ---------------- Invois
    I = 'Invois'

    def from_quote(field):
        return f'=IF([sh]="","",IFERROR(INDEX({field},MATCH([sh],SH_No,0)),""))'

    table_sheet(book, I, [
        dict(key='no', head='No. Invois', width=12, kind='auto',
             f='=IF([pelanggan]="","",Awalan_Invois&TEXT(Mula_Invois+ROW()-5,"0000"))'),
        dict(key='tarikh', head='Tarikh invois *', width=12, fmt=DATE_FMT, hint='cth: 15/01/2026'),
        dict(key='sh', head='No. Sebut Harga', width=14, dv='SH_No', fmt=TEXT, hint='Pilih SH: semua item & harga disalin'),
        dict(key='tempahan_in', head='No. Tempahan', width=13, dv='T_No', hint='Atau pilih tempahan'),
        dict(key='pelanggan_in', head='Pelanggan', width=20, dv='P_Nama', hint='Isi hanya jika tiada SH / tempahan'),
        dict(key='pelanggan', head='Pelanggan', width=22, kind='auto',
             f='=IF([pelanggan_in]<>"",[pelanggan_in],IF([sh]<>"",IFERROR(INDEX(SH_Pelanggan,MATCH([sh],SH_No,0))&"",""),'
               'IF([tempahan_in]<>"",IFERROR(INDEX(T_Pelanggan,MATCH([tempahan_in],T_No,0))&"",""),"")))'),
        dict(key='tempahan', head='No. Tempahan', width=13, kind='auto',
             f='=IF([tempahan_in]<>"",[tempahan_in],IF([sh]="","",IFERROR(INDEX(SH_Tempahan,MATCH([sh],SH_No,0))&"","")))'),
        dict(key='akhir', head='Tarikh akhir bayaran', width=12, kind='over', fmt=DATE_FMT, f='=IF([tarikh]="","",[tarikh]+TempohBayar)'),
        dict(key='diskaun', head='Diskaun (RM)', width=12, kind='over', fmt=RM, f=from_quote('SH_Diskaun')),
        dict(key='caj', head='Caj tambahan (RM)', width=12, kind='over', fmt=RM, f=from_quote('SH_Caj')),
        dict(key='label', head='Label caj tambahan', width=16, kind='over', f=f'=IF([sh]="","",IFERROR(INDEX(SH_Label,MATCH([sh],SH_No,0))&"",""))'),
        dict(key='cukai', head='Cukai (SST) %', width=10, kind='over', fmt='0%', f=from_quote('SH_Cukai')),
        dict(key='batal', head='Batal?', width=8, dv='L_Ya', hint='Ya = batal'),
        dict(key='sebab', head='Sebab batal', width=18),
        dict(key='kecil', head='Jumlah kecil', width=13, kind='auto', fmt=RM, f='=IF([no]="","",SUMIFS(IT_Jumlah,IT_Dok,[sumber]))'),
        dict(key='sumber', head='Item daripada', width=12, kind='auto',
             f='=IF([no]="","",IF(COUNTIF(IT_Dok,[no])>0,[no],[sh]))'),
        dict(key='nilai_cukai', head='Cukai (RM)', width=12, kind='auto', fmt=RM,
             f='=IF([no]="","",ROUND(([kecil]-N([diskaun])+N([caj]))*N([cukai]),2))'),
        dict(key='jumlah', head='Jumlah', width=14, kind='auto', fmt=RM, f='=IF([no]="","",[kecil]-N([diskaun])+N([caj])+[nilai_cukai])'),
        dict(key='deposit', head='Deposit diperlukan', width=13, kind='auto', fmt=RM, f='=IF([no]="","",ROUND([jumlah]*DepositPeratus,2))'),
        dict(key='bayar', head='Dibayar', width=13, kind='auto', fmt=RM, f='=IF([no]="","",SUMIFS(BY_Amaun,BY_Invois,[no],BY_Batal,"<>Ya"))'),
        dict(key='baki', head='Baki', width=13, kind='auto', fmt=RM, f='=IF([no]="","",[jumlah]-[bayar])'),
        dict(key='status', head='Status', width=15, kind='auto',
             f='=IF([no]="","",IF([batal]="Ya","Dibatalkan",IF(AND([jumlah]>0,[baki]<=0),"Dibayar",'
               'IF(AND([baki]>0,[akhir]<>"",[akhir]<TODAY()),"Tertunggak",IF([bayar]>0,"Dibayar Separa","Belum Dibayar")))))'),
        dict(key='kunci', head='kunci peringatan', kind='helper',
             f='=IF(AND([no]<>"",[status]<>"Dibatalkan"),IF([baki]>0,N([akhir])+ROW()/100000,""),"")'),
    ], tab_color='C00000')

    # ---------------- Item
    IT = 'Item'
    table_sheet(book, IT, [
        dict(key='dok', head='No. Dokumen *', width=14, dv='L_Dok', fmt=TEXT, hint='Pilih No. Sebut Harga atau No. Invois'),
        dict(key='bil', head='Bil', width=6, kind='auto', f=f'=IF([dok]="","",COUNTIF($A${FIRST}:A{{r}},[dok]))'),
        dict(key='perkara', head='Perkara / Keterangan *', width=36, dv='SV_Nama', free=True, hint='Pilih servis atau taip sendiri'),
        dict(key='butiran', head='Butiran tambahan', width=26),
        dict(key='qty', head='Kuantiti', width=9, hint='kosong = 1'),
        dict(key='unit', head='Unit', width=9, kind='over', f='=IF([perkara]="","",IFERROR(INDEX(SV_Unit,MATCH([perkara],SV_Nama,0))&"",""))'),
        dict(key='harga', head='Harga seunit (RM)', width=14, kind='over', fmt=RM,
             f='=IF([perkara]="","",IFERROR(INDEX(SV_Harga,MATCH([perkara],SV_Nama,0)),0))'),
        dict(key='jumlah', head='Jumlah (RM)', width=14, kind='auto', fmt=RM,
             f='=IF(OR([dok]="",[perkara]=""),"",ROUND(IF([qty]="",1,[qty])*N([harga]),2))'),
        dict(key='kunci', head='kunci', kind='helper', f='=IF([dok]="","",[dok]&"#"&[bil])'),
        dict(key='jenis', head='Jenis dokumen', width=13, kind='auto',
             f='=IF([dok]="","",IF(COUNTIF(INV_No,[dok])>0,"Invois",IF(COUNTIF(SH_No,[dok])>0,"Sebut Harga","⚠ Tiada")))'),
        dict(key='kira', head='kira hasil', kind='helper',
             f='=IF([jenis]="Invois",IF(INDEX(INV_Status,MATCH([dok],INV_No,0))="Dibatalkan",0,1),'
               'IF([jenis]="Sebut Harga",IF(COUNTIFS(INV_Sumber,[dok],INV_Status,"<>Dibatalkan")>0,1,0),0))'),
        dict(key='tarikh', head='tarikh dokumen', kind='helper', fmt=DATE_FMT,
             f='=IF([jenis]="Invois",INDEX(INV_Tarikh,MATCH([dok],INV_No,0)),IF([jenis]="Sebut Harga",'
               'IFERROR(INDEX(INV_Tarikh,MATCH([dok],INV_Sumber,0)),INDEX(SH_Tarikh,MATCH([dok],SH_No,0))),""))'),
    ], tab_color='FFC000')

    # ---------------- Bayaran (Resit)
    B = 'Bayaran'
    last_b = FIRST + ROWS[B] - 1
    table_sheet(book, B, [
        dict(key='no', head='No. Resit', width=11, kind='auto', f='=IF([invois]="","",Awalan_Resit&TEXT(Mula_Resit+ROW()-5,"0000"))'),
        dict(key='tarikh', head='Tarikh bayaran *', width=12, fmt=DATE_FMT, hint='cth: 20/01/2026 (masukkan ikut urutan tarikh)'),
        dict(key='invois', head='No. Invois *', width=12, dv='INV_No', fmt=TEXT),
        dict(key='amaun', head='Amaun (RM) *', width=13, fmt=RM, money_dv=True),
        dict(key='kaedah', head='Kaedah bayaran', width=15, dv='L_Kaedah'),
        dict(key='rujukan', head='Rujukan bayaran', width=16, hint='cth: M2U 123456'),
        dict(key='penerima', head='Diterima oleh', width=16),
        dict(key='ket', head='Keterangan', width=24),
        dict(key='batal', head='Batal?', width=8, dv='L_Ya'),
        dict(key='sebab', head='Sebab batal', width=16),
        dict(key='pelanggan', head='Pelanggan', width=22, kind='auto', f='=IF([no]="","",IFERROR(INDEX(INV_Pelanggan,MATCH([invois],INV_No,0))&"",""))'),
        dict(key='tempahan', head='No. Tempahan', width=12, kind='auto', f='=IF([no]="","",IFERROR(INDEX(INV_Tempahan,MATCH([invois],INV_No,0))&"",""))'),
        dict(key='jumlah_inv', head='Jumlah invois', width=13, kind='auto', fmt=RM, f='=IF([no]="","",IFERROR(INDEX(INV_Jumlah,MATCH([invois],INV_No,0)),0))'),
        dict(key='setakat', head='Dibayar setakat ini', width=13, kind='auto', fmt=RM,
             f=f'=IF(OR([no]="",[batal]="Ya",COUNTIF(INV_No,[invois])=0),"",SUMIFS($D${FIRST}:D{{r}},$C${FIRST}:C{{r}},[invois],$I${FIRST}:I{{r}},"<>Ya"))'),
        dict(key='baki', head='Baki selepas', width=13, kind='auto', fmt=RM, f='=IF([setakat]="","",[jumlah_inv]-[setakat])'),
        dict(key='jenis', head='Jenis bayaran', width=16, kind='auto',
             f=f'=IF([setakat]="","",IF([baki]<=0,IF(COUNTIFS($C${FIRST}:C{{r}},[invois],$I${FIRST}:I{{r}},"<>Ya")=1,"Bayaran Penuh","Bayaran Baki Akhir"),'
               f'IF(COUNTIFS($C${FIRST}:C{{r}},[invois],$I${FIRST}:I{{r}},"<>Ya")=1,"Deposit","Bayaran Separa")))'),
        dict(key='semak', head='Semakan', width=22, kind='auto',
             f='=IF([no]="","",IF([batal]="Ya","BATAL",IF([pelanggan]="","⚠ No. invois tidak wujud",IF([baki]<0,"⚠ Melebihi baki invois",""))))'),
    ], tab_color='00B050')

    # ---------------- Tetapan + Senarai
    tet = wb.create_sheet('Tetapan')
    tet.sheet_properties.tabColor = '7F7F7F'
    title(tet, 'TETAPAN', 'Isi maklumat perniagaan di lajur B (biru). Maklumat ini digunakan pada semua dokumen bercetak.')
    settings = [
        ('NamaPerniagaan', 'Nama perniagaan', 'Gita Gangsa Enterprise'),
        ('NoDaftar', 'No. pendaftaran (SSM)', '003060420-A'),
        ('Alamat1', 'Alamat baris 1', 'M-4-24, Blok M'),
        ('Alamat2', 'Alamat baris 2', 'Desa Mutiara'),
        ('Alamat3', 'Alamat baris 3', '43000 Kajang, Selangor'),
        ('Telefon', 'No. telefon', '019 364 7782'),
        ('Emel', 'E-mel', 'gitagangsa@gmail.com'),
        ('NamaBank', 'Nama bank', 'Maybank'),
        ('NoAkaun', 'No. akaun bank', '562021651487'),
        ('NamaAkaun', 'Nama pemegang akaun', 'Gita Gangsa Enterprise'),
        ('Penandatangan', 'Penandatangan dokumen', 'Abdul Mukmin bin Hamdan'),
        ('Jawatan', 'Jawatan', 'Pengurus'),
        ('DepositPeratus', 'Deposit diperlukan (%)', 0.5),
        ('TempohSah', 'Tempoh sah sebut harga (hari)', 14),
        ('TempohBayar', 'Tempoh bayaran invois (hari)', 14),
        ('TermaInv1', 'Terma invois baris 1', 'Untuk tempahan, bayaran deposit sebanyak 50% diperlukan.'),
        ('TermaInv2', 'Terma invois baris 2', 'Deposit tidak akan dipulangkan sekiranya pihak tuan/puan membatalkan tempahan.'),
        ('TermaInv3', 'Terma invois baris 3', 'Bayaran hendaklah dijelaskan sehari selepas majlis berlangsung.'),
        ('TermaSH1', 'Terma sebut harga baris 1', 'Sebut harga ini sah sehingga tarikh yang dinyatakan.'),
        ('TermaSH2', 'Terma sebut harga baris 2', 'Tempahan hanya disahkan selepas bayaran deposit 50% diterima.'),
        ('TermaSH3', 'Terma sebut harga baris 3', 'Deposit tidak akan dipulangkan sekiranya pihak tuan/puan membatalkan tempahan.'),
    ]
    tet.column_dimensions['A'].width = 30
    tet.column_dimensions['B'].width = 62
    tet.column_dimensions['C'].width = 4
    for i, (nm, label, value) in enumerate(settings):
        r = 4 + i
        tet[f'A{r}'] = label
        tet[f'A{r}'].font = F_HEAD
        tet[f'B{r}'] = value
        tet[f'B{r}'].font = F_INPUT
        tet[f'B{r}'].fill = FILL_YELLOW
        tet[f'B{r}'].border = B_ALL
        if nm == 'DepositPeratus':
            tet[f'B{r}'].number_format = '0%'
        book.name(nm, f'Tetapan!$B${r}')
    r0 = 4 + len(settings) + 1
    tet[f'A{r0}'] = 'PENOMBORAN DOKUMEN'
    tet[f'A{r0}'].font = Font(name=FONT, bold=True, size=11, color=GOLD)
    for j, h in enumerate(['Dokumen', 'Awalan', 'Nombor mula', 'Contoh nombor pertama']):
        c = tet.cell(row=r0 + 1, column=1 + j, value=h)
        c.font = F_HEAD
        c.fill = FILL_IN_HEAD
    tet.column_dimensions['D'].width = 22
    numbering = [('Pelanggan', 'CUS-', 1), ('Tempahan', 'BK-', 1), ('SH', 'QT-', 1), ('Invois', '', 211), ('Resit', 'RC-', 1)]
    labels = {'Pelanggan': 'Pelanggan', 'Tempahan': 'Tempahan', 'SH': 'Sebut harga', 'Invois': 'Invois', 'Resit': 'Resit'}
    for j, (key, prefix, start) in enumerate(numbering):
        r = r0 + 2 + j
        tet[f'A{r}'] = labels[key]
        tet[f'B{r}'] = prefix
        tet[f'C{r}'] = start
        for col in 'BC':
            tet[f'{col}{r}'].font = F_INPUT
            tet[f'{col}{r}'].fill = FILL_YELLOW
        tet[f'B{r}'].number_format = TEXT
        tet[f'D{r}'] = f'=B{r}&TEXT(C{r},"0000")'
        tet[f'D{r}'].fill = FILL_AUTO
        book.name(f'Awalan_{key}', f'Tetapan!$B${r}')
        book.name(f'Mula_{key}', f'Tetapan!$C${r}')
    tet[f'A{r0 + 8}'] = ('Invois bermula dari 0211 (meneruskan invois kertas 0210). Awalan kosong = nombor sahaja. '
                         'Ubah nombor mula SEBELUM dokumen pertama dimasukkan.')
    tet[f'A{r0 + 8}'].font = F_NOTE
    # editable lists
    lists_row = 4
    for col, head, nm, values in [
        ('E', 'Kategori pelanggan', 'L_Kategori', ['Individu', 'Korporat', 'Kerajaan', 'Sekolah / Universiti', 'NGO / Persatuan', 'Lain-lain']),
        ('F', 'Jenis acara', 'L_JenisAcara', ['Majlis Perkahwinan', 'Majlis Korporat', 'Majlis Rasmi Kerajaan', 'Persembahan Kebudayaan',
                                              'Majlis Sekolah / Universiti', 'Festival / Karnival', 'Lain-lain']),
    ]:
        tet.column_dimensions[col].width = 26
        tet[f'{col}{lists_row - 1}'] = head
        tet[f'{col}{lists_row - 1}'].font = F_HEAD
        tet[f'{col}{lists_row - 1}'].fill = FILL_IN_HEAD
        for k in range(20):
            cell = tet[f'{col}{lists_row + k}']
            cell.value = values[k] if k < len(values) else None
            cell.font = F_INPUT
            cell.border = B_ALL
        book.name(nm, f'Tetapan!${col}${lists_row}:${col}${lists_row + 19}')

    sen = wb.create_sheet('Senarai')
    sen.sheet_state = 'hidden'
    nq, ni = ROWS[Q], ROWS[I]
    sen['A1'] = 'Dokumen (SH + Invois)'
    for k in range(nq):
        sen[f'A{2 + k}'] = f"='{Q}'!A{FIRST + k}"
    for k in range(ni):
        sen[f'A{2 + nq + k}'] = f"=Invois!A{FIRST + k}"
    book.name('L_Dok', f'Senarai!$A$2:$A${1 + nq + ni}')
    for col, nm, values in [
        ('B', 'L_StatusSH', ['Draf', 'Dihantar', 'Dilihat', 'Diluluskan', 'Ditolak']),
        ('C', 'L_Tindakan', ['Disahkan', 'Selesai', 'Dibatalkan']),
        ('D', 'L_Ya', ['Ya']),
        ('E', 'L_Kaedah', ['Tunai', 'Pindahan Bank', 'DuitNow', 'Bayaran QR', 'Lain-lain']),
        ('F', 'L_Bulan', ['Semua'] + MONTHS),
    ]:
        for k, v in enumerate(values):
            sen[f'{col}{2 + k}'] = v
        book.name(nm, f'Senarai!${col}$2:${col}${1 + len(values)}')
    for k in range(1000):
        sen[f'G{2 + k}'] = ms_words(k)
    book.name('L_Kata', 'Senarai!$G$2:$G$1001')

    # ---------------- defined names for table columns
    prefixes = {P: 'P', S: 'SV', T: 'T', Q: 'SH', I: 'INV', IT: 'IT', B: 'BY'}
    names = {
        P: {'nama': 'Nama', 'syarikat': 'Syarikat', 'hubungi': 'Hubungi', 'tel': 'Tel', 'emel': 'Emel', 'alamat': 'Alamat'},
        S: {'nama': 'Nama', 'unit': 'Unit', 'harga': 'Harga'},
        T: {'no': 'No', 'pelanggan': 'Pelanggan', 'acara': 'Acara', 'tarikh': 'Tarikh', 'mula': 'Mula', 'tamat': 'Tamat', 'tempat': 'Tempat',
            'alamat': 'Alamat', 'status': 'Status', 'kunci_datang': 'KunciDatang', 'kunci_tarikh': 'KunciTarikh', 'jenis': 'Jenis'},
        Q: {'no': 'No', 'tarikh': 'Tarikh', 'tempahan': 'Tempahan', 'pelanggan': 'Pelanggan', 'sah': 'Sah', 'acara': 'Acara',
            'tarikh_acara': 'TarikhAcara', 'tempat': 'Tempat', 'diskaun': 'Diskaun', 'caj': 'Caj', 'label': 'Label', 'cukai': 'Cukai',
            'nilai_cukai': 'NilaiCukai', 'kecil': 'Kecil', 'jumlah': 'Jumlah', 'status': 'Status'},
        I: {'no': 'No', 'tarikh': 'Tarikh', 'sh': 'SH', 'pelanggan': 'Pelanggan', 'tempahan': 'Tempahan', 'akhir': 'Akhir',
            'diskaun': 'Diskaun', 'caj': 'Caj', 'label': 'Label', 'cukai': 'Cukai', 'nilai_cukai': 'NilaiCukai', 'kecil': 'Kecil',
            'sumber': 'Sumber', 'jumlah': 'Jumlah', 'bayar': 'Dibayar', 'baki': 'Baki', 'status': 'Status', 'kunci': 'Kunci'},
        IT: {'dok': 'Dok', 'perkara': 'Perkara', 'butiran': 'Butiran', 'qty': 'Kuantiti', 'unit': 'Unit', 'harga': 'Harga',
             'jumlah': 'Jumlah', 'kunci': 'Kunci', 'kira': 'Kira', 'tarikh': 'Tarikh'},
        B: {'no': 'No', 'tarikh': 'Tarikh', 'invois': 'Invois', 'amaun': 'Amaun', 'kaedah': 'Kaedah', 'rujukan': 'Rujukan',
            'penerima': 'Penerima', 'ket': 'Ket', 'batal': 'Batal', 'pelanggan': 'Pelanggan', 'tempahan': 'Tempahan',
            'jumlah_inv': 'JumlahInv', 'setakat': 'Setakat', 'baki': 'Baki', 'jenis': 'Jenis'},
    }
    for sheet, mapping in names.items():
        for key, suffix in mapping.items():
            book.name(f'{prefixes[sheet]}_{suffix}', book.col_range(sheet, key))

    # ---------------- status colours
    for sheet, key in [(T, 'status'), (Q, 'status'), (I, 'status'), (B, 'semak'), (T, 'amaran'), (P, 'semak')]:
        L = book.cols[sheet][key]
        ws = wb[sheet]
        status_colors(ws, f'{L}{FIRST}:{L}{FIRST + ROWS[sheet] - 1}', STATUS_STYLE)
        if key in ('amaran', 'semak'):
            ws.conditional_formatting.add(f'{L}{FIRST}:{L}{FIRST + ROWS[sheet] - 1}',
                                          FormulaRule(formula=[f'LEFT({L}{FIRST},1)="⚠"'], font=Font(color='9C0006', bold=True),
                                                      fill=PatternFill('solid', fgColor='FFC7CE')))

    # ---------------- printable documents
    print_sheet(book, 'Cetak Invois', 'invoice')
    print_sheet(book, 'Cetak Sebut Harga', 'quote')
    print_sheet(book, 'Cetak Resit', 'receipt')
    reports(book)
    dashboard(book, dash)
    write_guide(guide)

    # Sheet order
    order = ['Panduan', 'Papan Pemuka', 'Pelanggan', 'Tempahan', 'Sebut Harga', 'Invois', 'Item', 'Bayaran',
             'Cetak Invois', 'Cetak Sebut Harga', 'Cetak Resit', 'Laporan', 'Servis', 'Tetapan', 'Senarai']
    wb._sheets = [wb[n] for n in order]
    wb.active = 1

    fill_example(book, example)
    return wb


# ---------------------------------------------------------------- printable documents
def print_sheet(book, name, kind):
    wb = book.wb
    ws = wb.create_sheet(name)
    ws.sheet_properties.tabColor = GOLD
    widths = {'A': 11, 'B': 36, 'C': 14, 'D': 10, 'E': 20}
    for col, w in widths.items():
        ws.column_dimensions[col].width = w
    for col in 'FGHIJKLMN':
        ws.column_dimensions[col].hidden = True

    label = {'invoice': 'Pilih No. Invois ►', 'quote': 'Pilih No. Sebut Harga ►', 'receipt': 'Pilih No. Resit ►'}[kind]
    src_list = {'invoice': 'INV_No', 'quote': 'SH_No', 'receipt': 'BY_No'}[kind]
    ws['A1'] = label
    ws['A1'].font = Font(name=FONT, bold=True, color=GOLD)
    ws.merge_cells('A1:B1')
    ws['C1'].fill = FILL_YELLOW
    ws['C1'].font = Font(name=FONT, bold=True, size=11, color='0000FF')
    ws['C1'].number_format = TEXT
    ws['C1'].border = Border(left=MED, right=MED, top=MED, bottom=MED)
    ws.merge_cells('C1:D1')
    dv = DataValidation(type='list', formula1=f'={src_list}', allow_blank=True)
    dv.add('C1')
    ws.add_data_validation(dv)
    ws['E1'] = 'Fail → Cetak / Simpan PDF'
    ws['E1'].font = F_NOTE

    # hidden helpers: row index of the selected document
    sel = '$C$1'
    if kind == 'invoice':
        ws['G1'] = f'=IF({sel}="",0,IFERROR(MATCH({sel},INV_No,0),0))'
        r = '$G$1'
        ws['G2'] = f'=IF({r}=0,"",INDEX(INV_Sumber,{r})&"")'      # items source doc
        ws['G3'] = f'=IF({r}=0,"",INDEX(INV_Tempahan,{r})&"")'    # booking no
        ws['G4'] = f'=IF({r}=0,"",INDEX(INV_SH,{r})&"")'          # quotation no
        ws['G5'] = f'=IF({r}=0,"",INDEX(INV_Pelanggan,{r})&"")'
        ws['G6'] = '=IF($G$3="",0,IFERROR(MATCH($G$3,T_No,0),0))'               # booking row
        ws['G7'] = '=IF($G$4="",0,IFERROR(MATCH($G$4,SH_No,0),0))'              # quote row
        disc, caj, lab, tax, taxv = 'INV_Diskaun', 'INV_Caj', 'INV_Label', 'INV_Cukai', 'INV_NilaiCukai'
    elif kind == 'quote':
        ws['G1'] = f'=IF({sel}="",0,IFERROR(MATCH({sel},SH_No,0),0))'
        r = '$G$1'
        ws['G2'] = f'=IF({r}=0,"",INDEX(SH_No,{r})&"")'
        ws['G3'] = f'=IF({r}=0,"",INDEX(SH_Tempahan,{r})&"")'
        ws['G4'] = f'=IF({r}=0,"",INDEX(SH_No,{r})&"")'
        ws['G5'] = f'=IF({r}=0,"",INDEX(SH_Pelanggan,{r})&"")'
        ws['G6'] = '=IF($G$3="",0,IFERROR(MATCH($G$3,T_No,0),0))'
        ws['G7'] = f'={r}'
        disc, caj, lab, tax, taxv = 'SH_Diskaun', 'SH_Caj', 'SH_Label', 'SH_Cukai', 'SH_NilaiCukai'
    else:
        ws['G1'] = f'=IF({sel}="",0,IFERROR(MATCH({sel},BY_No,0),0))'
        r = '$G$1'
        ws['G3'] = f'=IF({r}=0,"",INDEX(BY_Tempahan,{r})&"")'
        ws['G5'] = f'=IF({r}=0,"",INDEX(BY_Pelanggan,{r})&"")'
        ws['G6'] = '=IF($G$3="",0,IFERROR(MATCH($G$3,T_No,0),0))'
    ws['G8'] = '=IF($G$5="",0,IFERROR(MATCH($G$5,P_Nama,0),0))'                 # customer row

    # ---- letterhead (rows 3-8)
    if LOGO.exists():
        img = XLImage(str(LOGO))
        img.width, img.height = 74, 74
        ws.add_image(img, 'A3')
    ws['B3'] = '=NamaPerniagaan'
    ws['B3'].font = Font(name=FONT, bold=True, size=14)
    ws['C3'] = '="("&NoDaftar&")"'
    ws['C3'].font = Font(name=FONT, size=8)
    ws['C3'].alignment = Alignment(vertical='bottom')
    ws['E3'] = {'invoice': 'INVOIS', 'quote': 'SEBUT HARGA', 'receipt': 'RESIT RASMI'}[kind]
    ws['E3'].font = Font(name=FONT, bold=True, size=15)
    ws['E3'].alignment = Alignment(horizontal='right')
    for i, nm in enumerate(['Alamat1', 'Alamat2', 'Alamat3']):
        ws[f'B{4 + i}'] = f'={nm}'
        ws[f'B{4 + i}'].font = Font(name='Times New Roman', size=11)
    ws['B7'] = '=Telefon&"          "&Emel'
    ws['B7'].font = Font(name='Times New Roman', size=11)
    if kind != 'receipt':
        stamp_src = 'INV_Status' if kind == 'invoice' else 'SH_Status'
        ws['E4'] = f'=IF({r}=0,"",IF(OR(INDEX({stamp_src},{r})="Dibayar",INDEX({stamp_src},{r})="Dibatalkan",INDEX({stamp_src},{r})="Diluluskan"),UPPER(INDEX({stamp_src},{r})),""))'
    else:
        ws['E4'] = f'=IF({r}=0,"",IF(INDEX(BY_Batal,{r})="Ya","BATAL",""))'
    ws['E4'].font = Font(name=FONT, bold=True, size=12, color='C00000')
    ws['E4'].alignment = Alignment(horizontal='right')
    for col in 'ABCDE':
        ws[f'{col}8'].border = Border(bottom=Side(style='thick', color='000000'))

    # ---- party + meta (rows 10-15)
    to_label = 'Diterima daripada :' if kind == 'receipt' else 'Kepada :'
    ws['A10'] = to_label
    ws['A10'].font = Font(name=FONT, bold=True)
    if kind == 'receipt':
        ws.merge_cells('A10:B10')
        name_cell = 'A11'
    else:
        name_cell = 'B10'
    ws[name_cell] = '=$G$5'
    ws[name_cell].font = Font(name='Times New Roman', bold=True, size=12)
    base = 12 if kind == 'receipt' else 11
    ws[f'B{base}'] = '=IF($G$8=0,"",IF(INDEX(P_Syarikat,$G$8)&""="","",INDEX(P_Syarikat,$G$8)&""))'
    ws[f'B{base + 1}'] = '=IF($G$8=0,"",IF(INDEX(P_Hubungi,$G$8)&""="","","u.p. "&INDEX(P_Hubungi,$G$8)))'
    ws[f'B{base + 2}'] = '=IF($G$8=0,"",INDEX(P_Alamat,$G$8)&"")'
    ws[f'B{base + 3}'] = '=IF($G$8=0,"",IF(INDEX(P_Tel,$G$8)&""="","","Tel: "&INDEX(P_Tel,$G$8)))'
    ws.row_dimensions[base + 2].height = 28
    for k in range(4):
        ws[f'B{base + k}'].font = Font(name='Times New Roman', size=10)
        ws[f'B{base + k}'].alignment = Alignment(wrap_text=True, vertical='top')
    time_fmt = 'IF(INDEX(T_Mula,$G$6)="","",TEXT(INDEX(T_Mula,$G$6),"h:mm AM/PM")&IF(INDEX(T_Tamat,$G$6)="",""," - "&TEXT(INDEX(T_Tamat,$G$6),"h:mm AM/PM")))'
    if kind == 'invoice':
        meta = [
            ('No. Invois', f'=IF({sel}="","",{sel})', TEXT, True),
            ('Tarikh', f'=IF({r}=0,"",INDEX(INV_Tarikh,{r}))', DATE_FMT, False),
            ('Tarikh akhir', f'=IF({r}=0,"",INDEX(INV_Akhir,{r}))', DATE_FMT, False),
            ('Tarikh majlis', '=IF($G$6>0,INDEX(T_Tarikh,$G$6),IF($G$7>0,INDEX(SH_TarikhAcara,$G$7),""))', DATE_FMT, False),
            ('Masa', f'=IF($G$6>0,{time_fmt},"")', None, False),
            ('Lokasi', '=IF($G$6>0,INDEX(T_Tempat,$G$6)&"",IF($G$7>0,INDEX(SH_Tempat,$G$7)&"",""))', None, False),
        ]
    elif kind == 'quote':
        meta = [
            ('No. Sebut Harga', f'=IF({sel}="","",{sel})', TEXT, True),
            ('Tarikh', f'=IF({r}=0,"",INDEX(SH_Tarikh,{r}))', DATE_FMT, False),
            ('Sah sehingga', f'=IF({r}=0,"",INDEX(SH_Sah,{r}))', DATE_FMT, False),
            ('Tarikh majlis', f'=IF({r}=0,"",INDEX(SH_TarikhAcara,{r}))', DATE_FMT, False),
            ('Masa', f'=IF($G$6>0,{time_fmt},"")', None, False),
            ('Lokasi', f'=IF({r}=0,"",INDEX(SH_Tempat,{r})&"")', None, False),
        ]
    else:
        meta = [
            ('No. Resit', f'=IF({sel}="","",{sel})', TEXT, True),
            ('Tarikh', f'=IF({r}=0,"",INDEX(BY_Tarikh,{r}))', DATE_FMT, False),
            ('No. Invois', f'=IF({r}=0,"",INDEX(BY_Invois,{r})&"")', TEXT, False),
            ('No. Tempahan', '=$G$3', None, False),
            ('Tarikh majlis', '=IF($G$6>0,INDEX(T_Tarikh,$G$6),"")', DATE_FMT, False),
        ]
    for i, (lbl, f, fmt, red) in enumerate(meta):
        row = 10 + i
        ws[f'C{row}'] = lbl
        ws[f'C{row}'].font = Font(name=FONT, bold=True, size=9)
        ws[f'C{row}'].alignment = Alignment(vertical='top')
        ws[f'D{row}'] = ':'
        ws[f'D{row}'].alignment = Alignment(horizontal='right', vertical='top')
        ws[f'E{row}'] = f
        ws[f'E{row}'].font = Font(name='Times New Roman', size=11, color='C00000' if red else '000000')
        ws[f'E{row}'].alignment = Alignment(horizontal='left', wrap_text=True, vertical='top')
        if fmt:
            ws[f'E{row}'].number_format = fmt

    top = 17
    if kind == 'receipt':
        receipt_body(book, ws, r, top)
    else:
        document_body(book, ws, kind, r, top, disc, caj, lab, tax, taxv)

    ws.print_area = f'A3:E{ws.max_row}'
    ws.print_options.horizontalCentered = True
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = 'portrait'
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_margins.left = ws.page_margins.right = 0.5
    ws.page_margins.top = ws.page_margins.bottom = 0.5
    ws.sheet_view.showGridLines = False


def box(ws, rng, left=True, right=True, top=False, bottom=False, side=BLACK):
    for row in ws[rng]:
        for c in row:
            c.border = Border(left=side if left else None, right=side if right else None,
                              top=side if top else None, bottom=side if bottom else None)


def document_body(book, ws, kind, r, top, disc, caj, lab, tax, taxv):
    heads = ['Bil', 'Perkara / Keterangan', 'Kuantiti', 'Kadar (RM)', 'Jumlah (RM)']
    for j, h in enumerate(heads):
        c = ws.cell(row=top, column=1 + j, value=h)
        c.font = Font(name=FONT, bold=True)
        c.alignment = Alignment(horizontal='center')
        c.border = Border(left=MED, right=MED, top=MED, bottom=MED)
    # adjustment lines helper (hidden I:K, rows 1-3)
    ws['I1'] = f'=IF({r}=0,0,N(INDEX({disc},{r})))'
    ws['J1'] = '="Diskaun"'
    ws['K1'] = '=IF(I1>0,1,0)'
    ws['I2'] = f'=IF({r}=0,0,N(INDEX({caj},{r})))'
    ws['J2'] = f'=IF({r}=0,"",IF(INDEX({lab},{r})&""="","Caj tambahan",INDEX({lab},{r})&""))'
    ws['K2'] = '=K1+IF(I2>0,1,0)'
    ws['I3'] = f'=IF({r}=0,0,N(INDEX({taxv},{r})))'
    ws['J3'] = f'=IF({r}=0,"","Cukai SST "&TEXT(N(INDEX({tax},{r})),"0%"))'
    ws['K3'] = '=K2+IF(I3>0,1,0)'
    ws['G9'] = '=IF($G$2="",0,COUNTIF(IT_Dok,$G$2))'   # number of item lines
    nlines = 12
    for k in range(1, nlines + 1):
        row = top + k
        key = f'$G$2&"#"&{k}'
        m = f'MATCH({key},IT_Kunci,0)'
        adj = f'{k}-$G$9'   # position among adjustment lines
        adj_row = f'MATCH({adj},$K$1:$K$3,0)'
        ws[f'A{row}'] = f'=IF({k}<=$G$9,{k},"")'
        ws[f'B{row}'] = (f'=IF({k}<=$G$9,IFERROR(INDEX(IT_Perkara,{m})&IF(INDEX(IT_Butiran,{m})&""="",""," ("&INDEX(IT_Butiran,{m})&")"),""),'
                         f'IF(AND({adj}>=1,{adj}<=$K$3),INDEX($J$1:$J$3,{adj_row}),""))')
        ws[f'C{row}'] = (f'=IF({k}<=$G$9,IFERROR(IF(INDEX(IT_Kuantiti,{m})&""="",1,INDEX(IT_Kuantiti,{m}))&'
                         f'IF(INDEX(IT_Unit,{m})&""="",""," "&INDEX(IT_Unit,{m})),""),"")')
        ws[f'D{row}'] = f'=IF({k}<=$G$9,IFERROR(INDEX(IT_Harga,{m}),""),"")'
        ws[f'E{row}'] = (f'=IF({k}<=$G$9,IFERROR(INDEX(IT_Jumlah,{m}),""),IF(AND({adj}>=1,{adj}<=$K$3),'
                         f'INDEX($I$1:$I$3,{adj_row})*IF({adj_row}=1,-1,1),""))')
        for col, al in zip('ABCDE', ['center', 'left', 'center', 'center', 'center']):
            ws[f'{col}{row}'].alignment = Alignment(horizontal=al, vertical='top', wrap_text=(col == 'B'))
            ws[f'{col}{row}'].font = Font(name=FONT, size=10)
        ws[f'D{row}'].number_format = NUM2
        ws[f'E{row}'].number_format = NUM2
        ws.row_dimensions[row].height = 18
        for col in 'ABCDE':
            ws[f'{col}{row}'].border = Border(left=BLACK, right=BLACK, bottom=BLACK if k == nlines else None)
    total_row = top + nlines + 1
    rows = [('JUMLAH BESAR', f'=IF({r}=0,"",INDEX({"INV_Jumlah" if kind == "invoice" else "SH_Jumlah"},{r}))', True)]
    if kind == 'invoice':
        rows += [('Jumlah dibayar', f'=IF({r}=0,"",INDEX(INV_Dibayar,{r}))', False),
                 ('BAKI PERLU DIBAYAR', f'=IF({r}=0,"",INDEX(INV_Baki,{r}))', True)]
    for i, (lbl, f, bold) in enumerate(rows):
        row = total_row + i
        ws.merge_cells(f'A{row}:D{row}')
        ws[f'A{row}'] = lbl
        ws[f'A{row}'].font = Font(name=FONT, bold=bold)
        ws[f'A{row}'].alignment = Alignment(horizontal='center' if i == 0 else 'right')
        ws[f'E{row}'] = f
        ws[f'E{row}'].number_format = NUM2
        ws[f'E{row}'].font = Font(name=FONT, bold=bold)
        ws[f'E{row}'].alignment = Alignment(horizontal='center')
        for col in 'ABCDE':
            ws[f'{col}{row}'].border = Border(left=MED if col in 'AE' else None, right=MED if col in 'DE' else None, top=MED, bottom=MED)
    row = total_row + len(rows) + 1
    terms = ['TermaInv1', 'TermaInv2', 'TermaInv3'] if kind == 'invoice' else ['TermaSH1', 'TermaSH2', 'TermaSH3']
    for t in terms:
        ws[f'A{row}'] = f'={t}&""'
        ws[f'A{row}'].font = Font(name=FONT, size=10)
        row += 1
    ws[f'A{row}'] = '="Bayaran boleh dimasukkan ke "&NamaBank&" "&NamaAkaun&" ("&NoAkaun&")"'
    ws[f'A{row}'].font = Font(name=FONT, size=10, bold=True)
    row += 2
    signature(ws, row)


def receipt_body(book, ws, r, top):
    for col, h in [('A', 'Bil'), ('B', 'Perkara / Keterangan'), ('E', 'Jumlah (RM)')]:
        ws[f'{col}{top}'] = h
    ws.merge_cells(f'B{top}:D{top}')
    for col in 'ABCDE':
        c = ws[f'{col}{top}']
        c.font = Font(name=FONT, bold=True)
        c.alignment = Alignment(horizontal='center')
        c.border = Border(left=MED if col in 'ABE' else None, right=MED if col in 'ADE' else None, top=MED, bottom=MED)
    desc = f'=IF({r}=0,"",IF(INDEX(BY_Ket,{r})&""<>"",INDEX(BY_Ket,{r})&"",INDEX(BY_Jenis,{r})&" bagi invois "&INDEX(BY_Invois,{r})))'
    lines = [
        ('1', desc, f'=IF({r}=0,"",INDEX(BY_Amaun,{r}))'),
        ('', f'=IF({r}=0,"","Jenis bayaran: "&INDEX(BY_Jenis,{r}))', ''),
        ('', f'=IF({r}=0,"","Kaedah bayaran: "&INDEX(BY_Kaedah,{r}))', ''),
        ('', f'=IF({r}=0,"",IF(INDEX(BY_Rujukan,{r})&""="","","Rujukan: "&INDEX(BY_Rujukan,{r})))', ''),
        ('', '', ''), ('', '', ''),
    ]
    for k, (bil, d, amt) in enumerate(lines, start=1):
        row = top + k
        ws.merge_cells(f'B{row}:D{row}')
        ws[f'A{row}'] = bil if bil else None
        ws[f'B{row}'] = d or None
        ws[f'E{row}'] = amt or None
        ws[f'E{row}'].number_format = NUM2
        for col in 'ABCDE':
            ws[f'{col}{row}'].font = Font(name=FONT, size=10)
            ws[f'{col}{row}'].border = Border(left=BLACK if col in 'ABE' else None, right=BLACK if col in 'ADE' else None,
                                              bottom=BLACK if k == len(lines) else None)
        ws[f'A{row}'].alignment = Alignment(horizontal='center')
        ws[f'E{row}'].alignment = Alignment(horizontal='center')
    row = top + len(lines) + 1
    for i, (lbl, f, bold) in enumerate([
        ('JUMLAH DITERIMA', f'=IF({r}=0,"",INDEX(BY_Amaun,{r}))', True),
        ('Jumlah invois', f'=IF({r}=0,"",INDEX(BY_JumlahInv,{r}))', False),
        ('Jumlah dibayar setakat ini', f'=IF({r}=0,"",INDEX(BY_Setakat,{r}))', False),
        ('BAKI TERTUNGGAK', f'=IF({r}=0,"",INDEX(BY_Baki,{r}))', True),
    ]):
        rr = row + i
        ws.merge_cells(f'A{rr}:D{rr}')
        ws[f'A{rr}'] = lbl
        ws[f'A{rr}'].font = Font(name=FONT, bold=bold)
        ws[f'A{rr}'].alignment = Alignment(horizontal='center' if i == 0 else 'right')
        ws[f'E{rr}'] = f
        ws[f'E{rr}'].number_format = NUM2
        ws[f'E{rr}'].font = Font(name=FONT, bold=bold)
        ws[f'E{rr}'].alignment = Alignment(horizontal='center')
        for col in 'ABCDE':
            ws[f'{col}{rr}'].border = Border(left=MED if col in 'AE' else None, right=MED if col in 'DE' else None, top=MED, bottom=MED)
    # amount in words (hidden helpers in I20:I25)
    ws['I20'] = f'=IF({r}=0,0,N(INDEX(BY_Amaun,{r})))'
    ws['I21'] = '=INT(I20)'
    ws['I22'] = '=ROUND((I20-I21)*100,0)'
    ws['I23'] = '=INT(I21/1000)'
    ws['I24'] = '=MOD(I21,1000)'
    ws['I25'] = ('=IF(I21=0,"kosong",IF(I21>=1000000,"",TRIM(IF(I23=0,"",IF(I23=1,"seribu",INDEX(L_Kata,I23+1)&" ribu"))'
                 '&" "&IF(I24=0,"",INDEX(L_Kata,I24+1)))))')
    words_row = row + 5
    ws.merge_cells(f'A{words_row}:E{words_row}')
    ws[f'A{words_row}'] = ('=IF(OR($G$1=0,I25=""),"","Ringgit Malaysia "&UPPER(LEFT(I25,1))&MID(I25,2,500)'
                           '&IF(I22>0," dan "&INDEX(L_Kata,I22+1)&" sen","")&" sahaja")')
    ws[f'A{words_row}'].font = Font(name=FONT, italic=True, size=10)
    rb = words_row + 2
    ws[f'A{rb}'] = f'=IF({r}=0,"",IF(INDEX(BY_Penerima,{r})&""="","","Diterima oleh: "&INDEX(BY_Penerima,{r})))'
    ws[f'A{rb + 1}'] = 'Resit ini dijana oleh komputer.'
    ws[f'A{rb + 1}'].font = F_NOTE
    signature(ws, rb + 3)


def signature(ws, row):
    ws[f'A{row}'] = 'Yang Benar,'
    ws[f'A{row}'].font = Font(name=FONT, bold=True)
    ws[f'A{row + 3}'] = '=UPPER(Penandatangan)'
    ws[f'A{row + 4}'] = '=UPPER(Jawatan)'
    for rr in (row + 3, row + 4):
        ws[f'A{rr}'].font = Font(name=FONT, bold=True)


# ---------------------------------------------------------------- reports
def reports(book):
    wb = book.wb
    ws = wb.create_sheet('Laporan')
    ws.sheet_properties.tabColor = '7030A0'
    title(ws, 'LAPORAN', 'Tukar tahun di sel B3. Semua angka dikira daripada helaian data.')
    ws['A3'] = 'Tahun'
    ws['A3'].font = F_HEAD
    ws['B3'] = "='Papan Pemuka'!B3"
    ws['B3'].font = F_OVER
    ws['B3'].fill = FILL_YELLOW
    ws['C3'] = '← ikut Papan Pemuka (boleh tulis ganti tahun lain)'
    ws['C3'].font = F_NOTE
    for col, w in zip('ABCDEFGH', [14, 13, 13, 16, 16, 16, 4, 4]):
        ws.column_dimensions[col].width = w

    heads = ['Bulan', 'Tempahan', 'Dibatalkan', 'Nilai invois', 'Dikutip', 'Tertunggak*']
    for j, h in enumerate(heads):
        c = ws.cell(row=5, column=1 + j, value=h)
        c.font = F_HEAD
        c.fill = FILL_AUTO_HEAD
        c.border = B_ALL
    for m in range(1, 13):
        row = 5 + m
        start = f'DATE($B$3,{m},1)'
        end = f'EOMONTH(DATE($B$3,{m},1),0)'
        ws[f'A{row}'] = MONTHS[m - 1]
        ws[f'B{row}'] = f'=COUNTIFS(T_Tarikh,">="&{start},T_Tarikh,"<="&{end},T_Status,"<>Dibatalkan")'
        ws[f'C{row}'] = f'=COUNTIFS(T_Tarikh,">="&{start},T_Tarikh,"<="&{end},T_Status,"Dibatalkan")'
        ws[f'D{row}'] = f'=SUMIFS(INV_Jumlah,INV_Tarikh,">="&{start},INV_Tarikh,"<="&{end},INV_Status,"<>Dibatalkan")'
        ws[f'E{row}'] = f'=SUMIFS(BY_Amaun,BY_Tarikh,">="&{start},BY_Tarikh,"<="&{end},BY_Batal,"<>Ya")'
        ws[f'F{row}'] = f'=SUMIFS(INV_Baki,INV_Tarikh,">="&{start},INV_Tarikh,"<="&{end},INV_Status,"<>Dibatalkan",INV_Baki,">0")'
        for col in 'ABCDEF':
            ws[f'{col}{row}'].border = B_ALL
            ws[f'{col}{row}'].font = F_AUTO
        for col in 'DEF':
            ws[f'{col}{row}'].number_format = RM
    ws['A18'] = 'JUMLAH'
    for col in 'BCDEF':
        ws[f'{col}18'] = f'=SUM({col}6:{col}17)'
        ws[f'{col}18'].font = F_HEAD
        ws[f'{col}18'].border = Border(top=BLACK, bottom=Side(style='double', color='000000'))
        if col in 'DEF':
            ws[f'{col}18'].number_format = RM
    ws['A18'].font = F_HEAD
    ws['A19'] = '* Baki semasa bagi invois yang dikeluarkan pada bulan tersebut.'
    ws['A19'].font = F_NOTE

    chart = BarChart()
    chart.type = 'col'
    chart.title = 'Hasil bulanan: diinvois vs dikutip (RM)'
    chart.y_axis.title = 'RM'
    chart.add_data(Reference(ws, min_col=4, min_row=5, max_col=5, max_row=17), titles_from_data=True)
    chart.set_categories(Reference(ws, min_col=1, min_row=6, max_row=17))
    chart.height, chart.width = 8, 18
    chart.roundedCorners = False
    chart.legend.position = 'b'
    chart.legend.overlay = False
    chart.title.overlay = False
    chart.x_axis.delete = False
    chart.y_axis.delete = False
    chart.y_axis.majorGridlines = None
    for s, color in zip(chart.series, ['2A78D6', 'EB6834']):
        s.graphicalProperties.solidFill = color
        s.graphicalProperties.line.solidFill = color
    ws.add_chart(chart, 'H5')

    # payment methods
    ws['A22'] = 'KUTIPAN MENGIKUT KAEDAH BAYARAN'
    ws['A22'].font = Font(name=FONT, bold=True, color=GOLD)
    for j, h in enumerate(['Kaedah', 'Bilangan', '', 'Amaun']):
        if h:
            c = ws.cell(row=23, column=1 + j, value=h)
            c.font = F_HEAD
            c.fill = FILL_AUTO_HEAD
    y0, y1 = 'DATE($B$3,1,1)', 'DATE($B$3,12,31)'
    for i, k in enumerate(['Tunai', 'Pindahan Bank', 'DuitNow', 'Bayaran QR', 'Lain-lain']):
        row = 24 + i
        ws[f'A{row}'] = k
        ws[f'B{row}'] = f'=COUNTIFS(BY_Kaedah,A{row},BY_Tarikh,">="&{y0},BY_Tarikh,"<="&{y1},BY_Batal,"<>Ya")'
        ws[f'D{row}'] = f'=SUMIFS(BY_Amaun,BY_Kaedah,A{row},BY_Tarikh,">="&{y0},BY_Tarikh,"<="&{y1},BY_Batal,"<>Ya")'
        ws[f'D{row}'].number_format = RM

    # service performance
    ws['A31'] = 'PRESTASI SERVIS (invois yang tidak dibatalkan, tahun dipilih)'
    ws['A31'].font = Font(name=FONT, bold=True, color=GOLD)
    for j, h in enumerate(['Servis', '', '', 'Bil. invois', 'Kuantiti', 'Hasil']):
        if h:
            c = ws.cell(row=32, column=1 + j, value=h)
            c.font = F_HEAD
            c.fill = FILL_AUTO_HEAD
    for i in range(20):
        row = 33 + i
        sv = f'Servis!A{FIRST + i}'
        ws[f'A{row}'] = f'=IF({sv}="","",{sv})'
        ws.merge_cells(f'A{row}:C{row}')
        crit = f'IT_Perkara,A{row},IT_Kira,1,IT_Tarikh,">="&{y0},IT_Tarikh,"<="&{y1}'
        ws[f'D{row}'] = f'=IF(A{row}="","",COUNTIFS({crit}))'
        ws[f'E{row}'] = f'=IF(A{row}="","",SUMIFS(IT_Kuantiti,{crit})+COUNTIFS({crit},IT_Kuantiti,""))'
        ws[f'F{row}'] = f'=IF(A{row}="","",SUMIFS(IT_Jumlah,{crit}))'
        ws[f'F{row}'].number_format = RM

    # outstanding invoices list
    ws['A55'] = 'INVOIS BELUM DIBAYAR PENUH (ikut tarikh akhir)'
    ws['A55'].font = Font(name=FONT, bold=True, color=GOLD)
    for j, h in enumerate(['No. Invois', 'Pelanggan', '', 'Tarikh akhir', 'Baki', 'Status']):
        if h:
            c = ws.cell(row=56, column=1 + j, value=h)
            c.font = F_HEAD
            c.fill = FILL_AUTO_HEAD
    for k in range(1, 26):
        row = 56 + k
        ws[f'J{row}'] = f'=IFERROR(MATCH(SMALL(INV_Kunci,{k}),INV_Kunci,0),0)'
        ws.column_dimensions['J'].hidden = True
        ws[f'A{row}'] = f'=IF($J{row}=0,"",INDEX(INV_No,$J{row}))'
        ws[f'B{row}'] = f'=IF($J{row}=0,"",INDEX(INV_Pelanggan,$J{row}))'
        ws.merge_cells(f'B{row}:C{row}')
        ws[f'D{row}'] = f'=IF($J{row}=0,"",INDEX(INV_Akhir,$J{row}))'
        ws[f'D{row}'].number_format = DATE_FMT
        ws[f'E{row}'] = f'=IF($J{row}=0,"",INDEX(INV_Baki,$J{row}))'
        ws[f'E{row}'].number_format = RM
        ws[f'F{row}'] = f'=IF($J{row}=0,"",INDEX(INV_Status,$J{row}))'
    status_colors(ws, 'F57:F81', STATUS_STYLE)
    landscape(ws)
    ws.sheet_view.showGridLines = False


def dashboard(book, ws):
    ws.sheet_properties.tabColor = GOLD
    title(ws, 'PAPAN PEMUKA', 'Pilih tahun (B3) dan bulan (D3). Semua angka dikemas kini secara automatik.')
    for col in 'ABCDEFGH':
        ws.column_dimensions[col].width = 17
    ws['A3'] = 'Tahun'
    ws['A3'].font = F_HEAD
    ws['B3'] = '=YEAR(TODAY())'
    ws['B3'].font = F_OVER
    ws['B3'].fill = FILL_YELLOW
    ws['C3'] = 'Bulan'
    ws['C3'].font = F_HEAD
    ws['D3'] = 'Semua'
    ws['D3'].font = F_INPUT
    ws['D3'].fill = FILL_YELLOW
    dv = DataValidation(type='list', formula1='=L_Bulan', allow_blank=False)
    dv.add('D3')
    ws.add_data_validation(dv)
    # hidden helpers J1:J4
    ws['J1'] = '=MATCH($D$3,L_Bulan,0)-1'
    ws['J2'] = '=IF($J$1=0,DATE($B$3,1,1),DATE($B$3,$J$1,1))'
    ws['J3'] = '=IF($J$1=0,DATE($B$3,12,31),EOMONTH($J$2,0))'
    ws['J4'] = '=IF($J$1=0,DATE(YEAR(TODAY()),MONTH(TODAY()),1),$J$2)'  # calendar month
    for col in 'JKL':
        ws.column_dimensions[col].hidden = True
    S, E = '$J$2', '$J$3'
    cards = [
        ('Jumlah tempahan', f'=COUNTIFS(T_Tarikh,">="&{S},T_Tarikh,"<="&{E},T_Status,"<>Dibatalkan")', '0', 'dalam tempoh dipilih'),
        ('Tempahan akan datang', '=COUNT(T_KunciDatang)', '0', 'mulai hari ini'),
        ('Sebut harga belum selesai', '=COUNTIFS(SH_Status,"Draf")+COUNTIFS(SH_Status,"Dihantar")+COUNTIFS(SH_Status,"Dilihat")', '0',
         '=TEXT(SUMIFS(SH_Jumlah,SH_Status,"Draf")+SUMIFS(SH_Jumlah,SH_Status,"Dihantar")+SUMIFS(SH_Jumlah,SH_Status,"Dilihat"),"""RM"" #,##0.00")'),
        ('Sebut harga diluluskan', f'=COUNTIFS(SH_Status,"Diluluskan",SH_Tarikh,">="&{S},SH_Tarikh,"<="&{E})', '0',
         f'=TEXT(SUMIFS(SH_Jumlah,SH_Status,"Diluluskan",SH_Tarikh,">="&{S},SH_Tarikh,"<="&{E}),"""RM"" #,##0.00")'),
        ('Jumlah invois', f'=COUNTIFS(INV_Tarikh,">="&{S},INV_Tarikh,"<="&{E},INV_Status,"<>Dibatalkan")', '0', 'dalam tempoh dipilih'),
        ('Bayaran tertunggak', '=SUMIFS(INV_Baki,INV_Status,"<>Dibatalkan",INV_Baki,">0")', RM,
         '="Lewat: "&TEXT(SUMIFS(INV_Baki,INV_Status,"Tertunggak"),"""RM"" #,##0.00")'),
        ('Jumlah hasil (diinvois)', f'=SUMIFS(INV_Jumlah,INV_Tarikh,">="&{S},INV_Tarikh,"<="&{E},INV_Status,"<>Dibatalkan")', RM, 'dalam tempoh dipilih'),
        ('Bayaran diterima', f'=SUMIFS(BY_Amaun,BY_Tarikh,">="&{S},BY_Tarikh,"<="&{E},BY_Batal,"<>Ya")', RM, 'dalam tempoh dipilih'),
    ]
    card_fill = PatternFill('solid', fgColor='FBF6EC')
    for i, (lbl, f, fmt, sub) in enumerate(cards):
        row = 5 + (i // 4) * 4
        col = 1 + (i % 4) * 2
        L, L2 = get_column_letter(col), get_column_letter(col + 1)
        ws.merge_cells(f'{L}{row}:{L2}{row}')
        ws.merge_cells(f'{L}{row + 1}:{L2}{row + 1}')
        ws.merge_cells(f'{L}{row + 2}:{L2}{row + 2}')
        ws[f'{L}{row}'] = lbl
        ws[f'{L}{row}'].font = Font(name=FONT, size=9, bold=True, color='595959')
        ws[f'{L}{row + 1}'] = f
        ws[f'{L}{row + 1}'].font = Font(name=FONT, size=18, bold=True)
        ws[f'{L}{row + 1}'].number_format = fmt
        ws[f'{L}{row + 1}'].alignment = Alignment(horizontal='left')
        ws[f'{L}{row + 2}'] = sub
        ws[f'{L}{row + 2}'].font = Font(name=FONT, size=8, italic=True, color='7F7F7F')
        for rr in range(row, row + 3):
            for cc in (L, L2):
                ws[f'{cc}{rr}'].fill = card_fill
    # upcoming events
    ws['A14'] = 'ACARA AKAN DATANG'
    ws['A14'].font = Font(name=FONT, bold=True, color=GOLD, size=11)
    for j, h in enumerate(['Tarikh', 'Masa', 'Acara', '', 'Pelanggan', 'Tempat', 'Status']):
        if h:
            c = ws.cell(row=15, column=1 + j, value=h)
            c.font = F_HEAD
            c.fill = FILL_AUTO_HEAD
    for k in range(1, 9):
        row = 15 + k
        ws[f'K{row}'] = f'=IFERROR(MATCH(SMALL(T_KunciDatang,{k}),T_KunciDatang,0),0)'
        x = f'$K{row}'
        ws[f'A{row}'] = f'=IF({x}=0,"",INDEX(T_Tarikh,{x}))'
        ws[f'A{row}'].number_format = DATE_FMT
        ws[f'B{row}'] = f'=IF({x}=0,"",IF(INDEX(T_Mula,{x})="","",TEXT(INDEX(T_Mula,{x}),"h:mm AM/PM")))'
        ws.merge_cells(f'C{row}:D{row}')
        ws[f'C{row}'] = f'=IF({x}=0,"",INDEX(T_Acara,{x})&"")'
        ws[f'E{row}'] = f'=IF({x}=0,"",INDEX(T_Pelanggan,{x})&"")'
        ws[f'F{row}'] = f'=IF({x}=0,"",INDEX(T_Tempat,{x})&"")'
        ws[f'G{row}'] = f'=IF({x}=0,"",INDEX(T_Status,{x}))'
    status_colors(ws, 'G16:G23', STATUS_STYLE)
    # payment reminders
    ws['A25'] = 'PERINGATAN BAYARAN (invois belum dibayar penuh)'
    ws['A25'].font = Font(name=FONT, bold=True, color=GOLD, size=11)
    for j, h in enumerate(['No. Invois', 'Pelanggan', '', 'Tarikh akhir', 'Baki', 'Keadaan']):
        if h:
            c = ws.cell(row=26, column=1 + j, value=h)
            c.font = F_HEAD
            c.fill = FILL_AUTO_HEAD
    for k in range(1, 9):
        row = 26 + k
        ws[f'L{row}'] = f'=IFERROR(MATCH(SMALL(INV_Kunci,{k}),INV_Kunci,0),0)'
        x = f'$L{row}'
        ws[f'A{row}'] = f'=IF({x}=0,"",INDEX(INV_No,{x}))'
        ws.merge_cells(f'B{row}:C{row}')
        ws[f'B{row}'] = f'=IF({x}=0,"",INDEX(INV_Pelanggan,{x}))'
        ws[f'D{row}'] = f'=IF({x}=0,"",INDEX(INV_Akhir,{x}))'
        ws[f'D{row}'].number_format = DATE_FMT
        ws[f'E{row}'] = f'=IF({x}=0,"",INDEX(INV_Baki,{x}))'
        ws[f'E{row}'].number_format = RM
        ws[f'F{row}'] = (f'=IF({x}=0,"",IF(INDEX(INV_Akhir,{x})="","Tiada tarikh akhir",IF(INDEX(INV_Akhir,{x})<TODAY(),'
                         f'"Lewat "&(TODAY()-INDEX(INV_Akhir,{x}))&" hari",IF(INDEX(INV_Akhir,{x})=TODAY(),"Perlu dibayar hari ini",'
                         f'"Dalam "&(INDEX(INV_Akhir,{x})-TODAY())&" hari"))))')
    ws.conditional_formatting.add('F27:F34', FormulaRule(formula=['LEFT(F27,5)="Lewat"'], font=Font(color='9C0006', bold=True)))
    # calendar
    ws['A37'] = '="KALENDAR TEMPAHAN: "&UPPER(INDEX(L_Bulan,MONTH($J$4)+1))&" "&YEAR($J$4)'
    ws['A37'].font = Font(name=FONT, bold=True, color=GOLD, size=11)
    for j, d in enumerate(['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad']):
        c = ws.cell(row=38, column=1 + j, value=d)
        c.font = F_HEAD
        c.fill = FILL_AUTO_HEAD
        c.alignment = Alignment(horizontal='center')
    for w in range(6):
        drow, erow = 39 + w * 2, 40 + w * 2
        for d in range(7):
            L = get_column_letter(1 + d)
            ws[f'{L}{drow}'] = f'=$J$4-WEEKDAY($J$4,2)+1+{w * 7 + d}'
            ws[f'{L}{drow}'].number_format = 'd'
            ws[f'{L}{drow}'].font = Font(name=FONT, bold=True, size=10)
            dref = f'{L}{drow}'
            ws[f'{L}{erow}'] = (f'=IF(COUNTIF(T_KunciTarikh,{dref})=0,"",IF(COUNTIF(T_KunciTarikh,{dref})=1,'
                                f'INDEX(T_Acara,MATCH({dref},T_KunciTarikh,0))&"",COUNTIF(T_KunciTarikh,{dref})&" acara"))')
            ws[f'{L}{erow}'].font = Font(name=FONT, size=8)
            ws[f'{L}{erow}'].alignment = Alignment(wrap_text=True, vertical='top')
            for rr in (drow, erow):
                ws[f'{L}{rr}'].border = Border(left=THIN, right=THIN, top=THIN if rr == drow else None, bottom=THIN if rr == erow else None)
        ws.row_dimensions[erow].height = 30
    cal = 'A39:G50'
    ws.conditional_formatting.add('A39:G50', FormulaRule(
        formula=['AND(MOD(ROW()-39,2)=0,A39=TODAY())'], fill=PatternFill('solid', fgColor=GOLD), font=Font(color='FFFFFF', bold=True)))
    ws.conditional_formatting.add('A39:G50', FormulaRule(
        formula=['AND(MOD(ROW()-39,2)=1,A39<>"")'], fill=PatternFill('solid', fgColor='DDEBF7'), font=Font(color='1F4E78', bold=True)))
    ws.conditional_formatting.add('A39:G50', FormulaRule(
        formula=['AND(MOD(ROW()-39,2)=0,MONTH(A39)<>MONTH($J$4))'], font=Font(color='BFBFBF')))
    del cal
    # chart from Laporan
    rep = book.wb['Laporan']
    chart = BarChart()
    chart.type = 'col'
    chart.title = 'Hasil bulanan (tahun di Laporan)'
    chart.add_data(Reference(rep, min_col=4, min_row=5, max_col=5, max_row=17), titles_from_data=True)
    chart.set_categories(Reference(rep, min_col=1, min_row=6, max_row=17))
    chart.height, chart.width = 7.5, 16
    chart.roundedCorners = False
    chart.legend.position = 'b'
    chart.legend.overlay = False
    chart.title.overlay = False
    chart.x_axis.delete = False
    chart.y_axis.delete = False
    chart.y_axis.majorGridlines = None
    for s, color in zip(chart.series, ['2A78D6', 'EB6834']):
        s.graphicalProperties.solidFill = color
        s.graphicalProperties.line.solidFill = color
    ws.add_chart(chart, 'I14')
    if LOGO.exists():
        img = XLImage(str(LOGO))
        img.width, img.height = 54, 54
        ws.add_image(img, 'H1')
    landscape(ws)
    ws.sheet_view.showGridLines = False


def landscape(ws):
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = 'landscape'
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True


def write_guide(ws):
    ws.sheet_properties.tabColor = GOLD
    ws.column_dimensions['A'].width = 4
    ws.column_dimensions['B'].width = 110
    if LOGO.exists():
        img = XLImage(str(LOGO))
        img.width, img.height = 64, 64
        ws.add_image(img, 'B1')
    lines = [
        ('h1', 'SISTEM PENGURUSAN GITA GANGSA (EDISI EXCEL)'),
        ('p', 'Pelanggan • Tempahan • Sebut Harga • Invois • Resit • Bayaran • Laporan. Berfungsi di Microsoft Excel (komputer, Android, iPhone) dan Google Sheets.'),
        ('h2', 'WARNA SEL'),
        ('p', 'KUNING (tajuk) / teks BIRU = isi sendiri.'),
        ('p', 'HIJAU = diisi automatik daripada tempahan / sebut harga / katalog. Boleh ditulis ganti jika perlu.'),
        ('p', 'KELABU = dikira automatik (nombor dokumen, jumlah, status). Jangan ubah.'),
        ('h2', 'PERATURAN PENTING'),
        ('p', '1. JANGAN padam baris atau sisip baris di tengah jadual. Nombor dokumen bergantung pada kedudukan baris.'),
        ('p', '2. Untuk membatalkan: Tempahan → lajur "Tindakan" = Dibatalkan; Invois / Bayaran → lajur "Batal?" = Ya.'),
        ('p', '3. Isi setiap jadual dari atas ke bawah tanpa melangkau baris. Masukkan bayaran mengikut urutan tarikh.'),
        ('p', '4. Nama pelanggan mesti unik (lajur Semakan akan memberi amaran jika berulang).'),
        ('p', '5. Simpan salinan fail ini (contohnya di Google Drive) sekurang-kurangnya seminggu sekali.'),
        ('h2', 'ALIRAN KERJA'),
        ('p', '1. PELANGGAN: tambah pelanggan baharu (ID diberi automatik).'),
        ('p', '2. TEMPAHAN: pilih pelanggan, isi acara, tarikh, masa dan tempat. Amaran muncul jika bertindih dengan tempahan lain.'),
        ('p', '3. SEBUT HARGA: pilih No. Tempahan (pelanggan & acara diisi sendiri). Kemudian di helaian ITEM, pilih No. Sebut Harga dan tambah servis.'),
        ('p', '4. Tukar Status sebut harga: Dihantar → Dilihat → Diluluskan. Status tempahan bertukar sendiri (Sebut Harga Dihantar → Disahkan).'),
        ('p', '5. INVOIS: pilih No. Sebut Harga yang diluluskan, dan SEMUA item, diskaun dan caj disalin. Tiada taip semula.'),
        ('p', '   (Atau pilih No. Tempahan dan masukkan item di helaian ITEM menggunakan No. Invois.)'),
        ('p', '6. BAYARAN: pilih No. Invois dan masukkan amaun. No. Resit, jenis (Deposit / Baki Akhir) dan baki dikira sendiri.'),
        ('p', '7. Status invois bertukar sendiri: Belum Dibayar → Dibayar Separa → Dibayar (atau Tertunggak jika lewat). Tempahan: Deposit Dibayar → Dibayar Penuh.'),
        ('p', '8. Selepas majlis: Tempahan → Tindakan = Selesai.'),
        ('h2', 'CETAK / PDF'),
        ('p', 'Buka helaian CETAK INVOIS, CETAK SEBUT HARGA atau CETAK RESIT → pilih nombor dokumen di sel kuning → Fail → Cetak (atau Simpan sebagai PDF / Kongsi).'),
        ('p', 'Excel Android: ⋮ → Cetak / Kongsi → PDF. Google Sheets: Fail → Muat turun → PDF (pilih "Helaian semasa").'),
        ('h2', 'TETAPAN'),
        ('p', 'Helaian TETAPAN: maklumat perniagaan, akaun bank, penandatangan, terma, peratus deposit, dan awalan & nombor mula dokumen.'),
        ('p', 'Invois bermula dari 0211 (meneruskan invois kertas). Ubah nombor mula hanya SEBELUM dokumen pertama dimasukkan.'),
        ('p', 'Helaian SERVIS: katalog servis & harga. Pilih servis di helaian ITEM dan harga diisi sendiri.'),
        ('h2', 'HAD EDISI EXCEL'),
        ('p', 'Kapasiti: 500 pelanggan, 500 tempahan, 500 sebut harga, 500 invois, 2,500 item dan 1,000 bayaran. Tiada log masuk atau kata laluan pengguna:'),
        ('p', 'lindungi fail dengan kata laluan Excel jika perlu (Fail → Maklumat → Lindungi Buku Kerja). Untuk ciri penuh, gunakan edisi web sistem ini.'),
    ]
    row = 5
    for kind, text in lines:
        if kind == 'h2':
            row += 1
        c = ws[f'B{row}']
        c.value = text
        c.alignment = Alignment(wrap_text=True, vertical='top')
        c.font = {'h1': Font(name=FONT, size=16, bold=True, color=GOLD), 'h2': Font(name=FONT, size=11, bold=True, color=GOLD)}.get(kind, Font(name=FONT, size=10))
        row += 1
    ws.sheet_view.showGridLines = False


# ---------------------------------------------------------------- example data
def put(ws, letters, row, **values):
    for key, v in values.items():
        ws[f'{letters[key]}{row}'] = v


def fill_example(book, example):
    wb = book.wb
    sv = wb['Servis']
    c = book.cols['Servis']
    services = [('Perkhidmatan Gamelan (6 Pemain)', 'Persembahan gamelan tradisional, 6 pemain', 'pakej', 1800)]
    if example:
        services += [
            ('Perkhidmatan Gamelan (10 Pemain)', 'Persembahan gamelan tradisional, 10 pemain', 'pakej', 2800),
            ('Persembahan Tarian Tradisional', '4 penari', 'set', 800),
            ('Sistem PA & Mikrofon', None, 'set', 500),
        ]
    for i, (n, d, u, p) in enumerate(services):
        put(sv, c, FIRST + i, nama=n, ket=d, unit=u, harga=p)
    if not example:
        wb['Cetak Invois']['C1'] = None
        return

    P = wb['Pelanggan']
    c = book.cols['Pelanggan']
    put(P, c, 5, nama='Puan Annie', tel='012-345 6789', alamat='No. 12, Jalan Mawar 3\n43000 Kajang, Selangor', kategori='Individu')
    put(P, c, 6, nama='Majlis Perbandaran Kajang', syarikat='MPKj', hubungi='Encik Rahman', tel='03-8737 7899',
        emel='rahman@mpkj.gov.my', alamat='Menara MPKj, Jalan Cempaka Putih\n43000 Kajang, Selangor', kategori='Kerajaan')
    put(P, c, 7, nama='Syarikat Seri Murni Sdn Bhd', syarikat='Seri Murni Sdn Bhd', hubungi='Cik Aina', tel='012-998 1122',
        emel='aina@serimurni.my', alamat='Lot 5, Jalan Teknologi\n43650 Bangi, Selangor', kategori='Korporat')

    T = wb['Tempahan']
    c = book.cols['Tempahan']
    put(T, c, 5, rekod=date(2026, 1, 10), pelanggan='Puan Annie', acara='Majlis Perkahwinan Annie & Hafiz', jenis='Majlis Perkahwinan',
        tarikh=date(2026, 8, 16), mula=time(11, 0), tamat=time(14, 0), tempat='Dewan Seri Kajang', pakej='Perkhidmatan Gamelan (6 Pemain)',
        pax=6, tindakan='Selesai')
    put(T, c, 6, rekod=date(2026, 10, 1), pelanggan='Majlis Perbandaran Kajang', acara='Malam Kebudayaan Kajang', jenis='Majlis Rasmi Kerajaan',
        tarikh=date(2026, 12, 12), mula=time(20, 0), tamat=time(23, 0), tempat='Dataran Kajang', pakej='Perkhidmatan Gamelan (10 Pemain)', pax=14,
        khas='Pentas 8m x 6m disediakan oleh pihak MPKj')
    put(T, c, 7, rekod=date(2026, 11, 15), pelanggan='Syarikat Seri Murni Sdn Bhd', acara='Majlis Makan Malam Tahunan', jenis='Majlis Korporat',
        tarikh=date(2027, 1, 20), mula=time(19, 30), tamat=time(22, 30), tempat='Hotel Everly Putrajaya', pakej='Perkhidmatan Gamelan (6 Pemain)')

    Q = wb['Sebut Harga']
    c = book.cols['Sebut Harga']
    put(Q, c, 5, tarikh=date(2026, 1, 12), tempahan='BK-0001', pilih='Diluluskan')
    put(Q, c, 6, tarikh=date(2026, 10, 5), tempahan='BK-0002', diskaun=300, caj=200, label='Pengangkutan', pilih='Diluluskan')
    put(Q, c, 7, tarikh=date(2026, 11, 16), tempahan='BK-0003', pilih='Dihantar')

    IT = wb['Item']
    c = book.cols['Item']
    put(IT, c, 5, dok='QT-0001', perkara='Perkhidmatan Gamelan (6 Pemain)')
    put(IT, c, 6, dok='QT-0002', perkara='Perkhidmatan Gamelan (10 Pemain)')
    put(IT, c, 7, dok='QT-0002', perkara='Persembahan Tarian Tradisional')
    put(IT, c, 8, dok='QT-0003', perkara='Perkhidmatan Gamelan (6 Pemain)')
    put(IT, c, 9, dok='QT-0003', perkara='Sistem PA & Mikrofon')

    I = wb['Invois']
    c = book.cols['Invois']
    put(I, c, 5, tarikh=date(2026, 1, 15), sh='QT-0001')
    put(I, c, 6, tarikh=date(2026, 11, 10), sh='QT-0002')
    I[f"{c['akhir']}5"] = date(2026, 8, 17)  # written over: payment due the day after the event

    B = wb['Bayaran']
    c = book.cols['Bayaran']
    put(B, c, 5, tarikh=date(2026, 1, 20), invois='0211', amaun=900, kaedah='Pindahan Bank', rujukan='M2U 4471', penerima='Abdul Mukmin')
    put(B, c, 6, tarikh=date(2026, 8, 17), invois='0211', amaun=900, kaedah='DuitNow', penerima='Abdul Mukmin')
    put(B, c, 7, tarikh=date(2026, 11, 12), invois='0212', amaun=1750, kaedah='Pindahan Bank', rujukan='CIMB 99812', penerima='Abdul Mukmin')

    wb['Cetak Invois']['C1'] = '0212'
    wb['Cetak Sebut Harga']['C1'] = 'QT-0002'
    wb['Cetak Resit']['C1'] = 'RC-0003'


if __name__ == '__main__':
    OUT_DIR.mkdir(exist_ok=True)
    for example, fname in [(False, 'SistemGitaGangsa.xlsx'), (True, 'SistemGitaGangsa-Contoh.xlsx')]:
        wb = build(example)
        wb.save(OUT_DIR / fname)
        print('saved', OUT_DIR / fname)
