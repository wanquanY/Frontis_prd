import csvLogo from "@/assets/images/fileLogo/csv-logo.svg";
import docLogo from "@/assets/images/fileLogo/doc-logo.svg";
import docxLogo from "@/assets/images/fileLogo/docx-logo.svg";
import markdownLogo from "@/assets/images/fileLogo/markdown-logo.svg";
import pdfLogo from "@/assets/images/fileLogo/pdf-logo.svg";
import pptLogo from "@/assets/images/fileLogo/ppt-logo.svg";
import pptxLogo from "@/assets/images/fileLogo/pptx-logo.svg";
import txtLogo from "@/assets/images/fileLogo/txt-logo.svg";
import xlsLogo from "@/assets/images/fileLogo/xls-logo.svg";
import xlsxLogo from "@/assets/images/fileLogo/xlsx-logo.svg";
import htmlLogo from "@/assets/images/fileLogo/html-logo.svg";
import { getFileExtension } from "./file";

type FileLogo = { src: string; alt: string };

const defaultLogo: FileLogo = { src: txtLogo, alt: "文件" };

const logoMap: Record<string, FileLogo> = {
  csv: { src: csvLogo, alt: "CSV 文件" },
  doc: { src: docLogo, alt: "DOC 文件" },
  docx: { src: docxLogo, alt: "DOCX 文件" },
  md: { src: markdownLogo, alt: "Markdown 文件" },
  markdown: { src: markdownLogo, alt: "Markdown 文件" },
  pdf: { src: pdfLogo, alt: "PDF 文件" },
  ppt: { src: pptLogo, alt: "PPT 文件" },
  pptx: { src: pptxLogo, alt: "PPTX 文件" },
  txt: { src: txtLogo, alt: "TXT 文件" },
  xls: { src: xlsLogo, alt: "XLS 文件" },
  xlsx: { src: xlsxLogo, alt: "XLSX 文件" },
  html: { src: htmlLogo, alt: "HTML 文件" },
};

/**
 * resolveFileLogo
 *
 * 根据文件名解析对应的文件图标资源，未匹配到时返回默认通用图标。
 */
export const resolveFileLogo = (filename: string): FileLogo => {
  const ext = getFileExtension(filename);
  if (!ext) return defaultLogo;
  return logoMap[ext] ?? defaultLogo;
};
