import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AfterViewInit } from '@angular/core';
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})
export class ReportComponent implements AfterViewInit {
  rating: number = 4;
  ngAfterViewInit(): void {
    this.downloadPDF();
    this.printReport();
  }

  printReport(): void {
    const printElement = document.getElementById('print');
    const printContent = printElement ? printElement.innerHTML : '';
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Copies existing html files related styles
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(style => style.outerHTML)
        .join('');
      printWindow.document.write(`
          <html>
            <head>
              <title>Generate Report</title>
              ${styles}
            </head>
            <body>
              <h5>Report</h5>
              ${printContent}
            </body>
          </html>
        `);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    }
  }

  downloadPDF(): void {
    const element = document.getElementById('print') as HTMLElement; // Select the modal content

    const options = {
      margin: [10, 10, 10, 10], // Margins for the PDF
      filename: 'Report.pdf', // Name of the PDF file
      image: { type: 'jpeg', quality: 0.98 }, // Image quality
      html2canvas: {
        scale: 2, // Scale for better quality
        useCORS: true, // Enable cross-origin resource sharing
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait', // Portrait orientation
      },
      pagebreak: { mode: ['css', 'legacy'] }, // Avoid splitting content
    };
    html2pdf().set(options).from(element).save();
  }

}
