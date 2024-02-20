# apply_styles.py
import openpyxl

def apply_styles(file_path):
    workbook = openpyxl.load_workbook(file_path)
    worksheet = workbook.active

    # Apply your styles here

    workbook.save(file_path)

if __name__ == "__main__":
    # Assuming the Excel file path is provided as a command-line argument
    import sys
    file_path = sys.argv[1]
    apply_styles(file_path)
    from openpyxl.styles import Font, Alignment, PatternFill
    from openpyxl.utils import get_column_letter

    def apply_styles(file_path):
        workbook = openpyxl.load_workbook(file_path)
        worksheet = workbook.active

        # Apply your styles here
        orange_fill = PatternFill(start_color="FFA500", end_color="FFA500", fill_type="solid")
        bold_font = Font(bold=True)
        center_alignment = Alignment(horizontal="center")

        # More styling
        worksheet['A1'].fill = orange_fill
        worksheet['A1'].font = bold_font
        worksheet['A1'].alignment = center_alignment

        for column in worksheet.columns:
            column_letter = get_column_letter(column[0].column)
            if column_letter != 'A':
                worksheet.column_dimensions[column_letter].width = 15
                for cell in column:
                    cell.fill = orange_fill
                    cell.font = bold_font
                    cell.alignment = center_alignment

        workbook.save(file_path)

if __name__ == "__main__":
    # Assuming the Excel file path is provided as a command-line argument
    import sys
    file_path = sys.argv[1]
    apply_styles(file_path)