# apply_styles.py
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

def apply_styles(file_path):
    workbook = openpyxl.load_workbook(file_path)
    worksheet = workbook.active

    # Definir estilos
    orange_fill = PatternFill(start_color="FF9900", end_color="FF9900", fill_type="solid")
    red_fill = PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid")
    gray_fill = PatternFill(start_color="EFEFEF", end_color="EFEFEF", fill_type="solid")
    bold_font = Font(bold=True, name="Poppins")
    header_font = Font(bold=True, name="Poppins", size=12)
    center_alignment = Alignment(horizontal="center")
    left_alignment = Alignment(horizontal="left")
    row_spacing = 2

    # Estilo para la celda A1
    worksheet['A1'].fill = orange_fill
    worksheet['A1'].font = bold_font
    worksheet['A1'].alignment = center_alignment

    # Estilo para los nombres de las columnas
    for column in worksheet.iter_cols(min_row=1, max_row=1):
        max_width = 0
        for cell in column:
            cell.fill = orange_fill
            cell.font = header_font
            # Bold
            cell.font = bold_font
            # Capitalize
            cell.value = cell.value.capitalize()
            cell.alignment = center_alignment
            column_letter = get_column_letter(cell.column)
            if len(cell.value) > max_width:
                max_width = len(cell.value)
        
        worksheet.column_dimensions[column_letter].width = max_width + 5

    # Estilo para las celdas de la primera columna (excluyendo la cabecera)
    for row in worksheet.iter_rows(min_row=2):
        cell = row[0]
        cell.fill = gray_fill
        cell.font = bold_font
        cell.alignment = left_alignment
        cell.border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
        column_letter = get_column_letter(cell.column)
        worksheet.column_dimensions[column_letter].width = max(len(cell.value) + 11, 10)  # Ajustar ancho de columna

    # Estilo para las celdas después de la segunda columna
    for column in worksheet.iter_cols(min_col=2):
        for cell in column:
            cell.alignment = center_alignment
            # Fine bold text 
            cell.font = Font(name="Poppins")
            cell.border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

    # Definir estilos adicionales
    red_font = Font(color="FF0000", name="Poppins")
    red_bck_bold_font = Font(color="FF0000", bold=True, name="Poppins")

    # Aplicar estilos a las celdas correspondientes
    for row in worksheet.iter_rows(min_row=2):
        tienda_solar_price_cell = row[1]
        try:
            tienda_solar_price = float(tienda_solar_price_cell.value)
        except (TypeError, ValueError):
            print(f"Valor inválido en la celda {tienda_solar_price_cell.coordinate}: {tienda_solar_price_cell.value}")
            continue

        for cell in row[2:]:
            if cell.value is not None:
                try:
                    cell_value = float(cell.value)
                except (TypeError, ValueError):
                    print(f"Valor inválido en la celda {cell.coordinate}: {cell.value}")
                    continue

                if cell_value < tienda_solar_price:
                    # Poner fondo rojo y texto en negrita
                    tienda_solar_price_cell.fill = red_fill
                    tienda_solar_price_cell.font = bold_font
                    break  # No es necesario seguir buscando si ya se encontró un precio más barato
                else:
                    # No aplicar estilo
                    pass

    # Guardar los cambios en el archivo Excel
    workbook.save(file_path)

if __name__ == "__main__":
    # Suponiendo que la ruta del archivo Excel se proporciona como argumento de línea de comandos
    import sys
    file_path = sys.argv[1]
    apply_styles(file_path)
