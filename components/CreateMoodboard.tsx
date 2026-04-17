
import React, { useState, useRef, useMemo } from 'react';
import { PhotoIcon } from './icons/PhotoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './icons/MagnifyingGlassPlusIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { RectangleGroupIcon } from './icons/RectangleGroupIcon';
import { useMode } from '../contexts/ModeContext';
import { apiClient, getImageSizeConfig, getImageSize } from '../lib/api';
import Pagination from './Pagination';
import FilterDropdown from './FilterDropdown';

interface CreateMoodboardProps {
  onBack: () => void;
}

interface HistoryItem {
  id: string;
  moodboardUrl: string; // The moodboard used (or input image for exterior)
  contextUrl: string; // The background context used (or empty for exterior)
  resultUrl: string;
  timestamp: number;
}

// Helper to convert Base64/DataURL to File
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error("Invalid data URL");
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const CreateMoodboard: React.FC<CreateMoodboardProps> = ({ onBack }) => {
  const { isPro, getModelName, proResolution } = useMode();
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [moodboardMode, setMoodboardMode] = useState<'interior' | 'exterior'>('interior');
  
  // --- Interior Mode State ---
  const [backgroundImages, setBackgroundImages] = useState<{ id: string; url: string; file: File }[]>([]);
  const [selectedBackgroundIds, setSelectedBackgroundIds] = useState<string[]>([]);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const [moodboardImage, setMoodboardImage] = useState<{ url: string; file: File } | null>(null);
  const moodboardFileInputRef = useRef<HTMLInputElement>(null);

  // --- Exterior Mode State ---
  const [exteriorInputImage, setExteriorInputImage] = useState<{ url: string; file: File } | null>(null);
  const exteriorFileInputRef = useRef<HTMLInputElement>(null);
  const [exteriorProjectName, setExteriorProjectName] = useState('');
  const [exteriorDescription, setExteriorDescription] = useState('');
  const [exteriorStyle, setExteriorStyle] = useState('');

  // Aspect Ratio State
  const [aspectRatio, setAspectRatio] = useState('Auto');

  // General State
  const [isProcessing, setIsProcessing] = useState(false); // For generating the moodboard asset
  const [isMerging, setIsMerging] = useState(false); // For the final merge (both modes)
  const [generatedResults, setGeneratedResults] = useState<string[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
  const paginatedHistory = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return history.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [history, currentPage]);

  // --- Handlers for Interior Mode ---
  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newImages = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file as Blob),
        file: file as File
      }));
      setBackgroundImages(prev => [...prev, ...newImages]);
      // Auto-select newly added images if moodboard is ready
      setSelectedBackgroundIds(prev => [...prev, ...newImages.map(img => img.id)]);
    }
    if (event.target) event.target.value = '';
  };

  const removeBackgroundImage = (id: string) => {
    setBackgroundImages(prev => {
        const img = prev.find(i => i.id === id);
        if (img) URL.revokeObjectURL(img.url);
        return prev.filter(i => i.id !== id);
    });
    setSelectedBackgroundIds(prev => prev.filter(i => i !== id));
  };

  const toggleBackgroundSelection = (id: string) => {
    setSelectedBackgroundIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleMoodboardImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMoodboardImage({ url, file });
    }
    if (event.target) event.target.value = '';
  };

  // --- Handlers for Exterior Mode ---
  const handleExteriorImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setExteriorInputImage({ url, file });
      }
      if (event.target) event.target.value = '';
  };

  const clearExteriorImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (exteriorInputImage) URL.revokeObjectURL(exteriorInputImage.url);
      setExteriorInputImage(null);
      if (exteriorFileInputRef.current) exteriorFileInputRef.current.value = '';
  };

  // --- Generation Logic ---

  // Function to generate the Moodboard Asset (Interior)
  const handleGenerateMoodboardAsset = async () => {
      if (!moodboardImage) {
          alert("Vui lòng tải ảnh tham khảo để tạo Moodboard.");
          return;
      }

      setIsProcessing(true);
      try {
        
        let promptContent = `Create a high-resolution interior/architecture design moodboard in a clean magazine-style layout.  
This moodboard must follow the exact structure below, but all content, colors, materials, furniture 
and imagery must be generated based on the provided image style.

[MAIN IMAGE REFERENCE]: Use the provided image as style/geometry reference.

------------------------------------------------------------
SECTION 1 — TOP LEFT (TITLE BLOCK)
------------------------------------------------------------
Place the title exactly in this format:
[DESIGN STYLE]  
[SPACE TYPE]
Below it, list 4–6 style descriptors.
Below the text, place a small rectangular thumbnail extracted from the MAIN INTERIOR/ARCHITECTURE scene.

------------------------------------------------------------
SECTION 2 — COLOR PALETTE
------------------------------------------------------------
Label: COLOR PALETTE
Generate 6–10 color swatches matching the style.
Colors should be extracted logically from the MAIN SCENE.

------------------------------------------------------------
SECTION 3 — MATERIAL / FABRIC / FINISH PALETTES
------------------------------------------------------------
Label: MATERIAL PALETTES
Generate 6–9 material swatches based on material direction.
Each swatch must have a short uppercase label.

------------------------------------------------------------
SECTION 4 — FLOORING / SPECIAL MATERIAL BOARD
------------------------------------------------------------
If the space has flooring or a dominant surface material, show 1 large swatch.
Label automatically.

------------------------------------------------------------
SECTION 5 — MAIN SCENE (RIGHT SIDE)
------------------------------------------------------------
On the right half of the moodboard, place a large rendering generated from the user input.
• Follow style, functional type, materials, palette.
• Composition: choose the most representative camera angle.
• If Reference exists → preserve layout & geometry.

------------------------------------------------------------
SECTION 6 — FURNITURE / OBJECT COLLECTION (BOTTOM)
------------------------------------------------------------
Label-free clean catalog row.
Generate 5–10 isolated cutout objects/furniture/items that match the style.
Render them on white background, evenly spaced.

------------------------------------------------------------
SECTION 7 — GLOBAL RULES
------------------------------------------------------------
• White background, editorial grid layout  
• Professional architecture/interior presentation board  
• Clean spacing, aligned columns  
• No borders, no shadows  
• All text must remain minimal & modern  
• Automatically harmonize colors, materials, objects across all sections`;

        if (isPro) {
            promptContent += " Output resolution 4K, highly detailed.";
        }

        const supportedAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
        const validAspectRatio = supportedAspectRatios.includes(aspectRatio) ? aspectRatio : undefined;
        
        if (aspectRatio !== 'Auto' && !validAspectRatio) {
            promptContent += `\nEnsure the final image has an aspect ratio of ${aspectRatio}.`;
        }

        const parts: any[] = [{ text: promptContent }];
        
        if (moodboardImage) {
            const base64 = await blobToBase64(moodboardImage.file);
            parts.unshift({ inlineData: { data: base64, mimeType: moodboardImage.file.type } });
        }

        const response = await apiClient.generateContent({
            model: getModelName('image'),
            contents: { parts },
            config: { 
                responseModalities: ['IMAGE'],
                ...( (isPro || validAspectRatio) ? {
                    imageConfig: {
                        ...getImageSize(isPro, proResolution),
                        ...(validAspectRatio ? { aspectRatio: validAspectRatio as any } : {})
                    }
                } : {})
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            const base64 = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            const url = `data:${mimeType};base64,${base64}`;
            const file = dataURLtoFile(url, 'generated-moodboard.png');
            
            if (moodboardImage) URL.revokeObjectURL(moodboardImage.url);
            setMoodboardImage({ url, file });
        } else {
            throw new Error("API returned no image data.");
        }

      } catch (error) {
          console.error("Error generating moodboard:", error);
          alert("Không thể tạo moodboard. Vui lòng thử lại.");
      } finally {
          setIsProcessing(false);
      }
  };

  // --- Handler for Exterior Generation ---
  const handleGenerateExteriorMoodboard = async () => {
      if (!exteriorInputImage) {
          alert("Vui lòng tải ảnh công trình.");
          return;
      }
      if (!exteriorStyle) {
          alert("Vui lòng chọn phong cách thiết kế.");
          return;
      }

      setIsMerging(true);
      setGeneratedResults([]);
      setActiveTab('results');

      try {
          const inputBase64 = await blobToBase64(exteriorInputImage.file);

          let promptTemplate = "";
          const projectName = exteriorProjectName || "CÔNG TRÌNH";
          const projectDesc = exteriorDescription || "Thiết kế kiến trúc hiện đại";

          if (exteriorStyle === "Phong cách 1") {
              promptTemplate = `Tạo một bảng trình bày kiến trúc (architectural presentation board) phong cách tối giản – màu watercolor hồng pastel – giống bản vẽ concept schematic design.

Bao gồm các thành phần sau:

1) **Tiêu đề lớn & thông tin dự án**
   - Tiêu đề: “${projectName}”
   - Subtitle: “${projectDesc}”
   - Typography hiện đại, bold, chữ đen rõ nét.

2) **Hình khối phát triển ý tưởng (Massing Diagram)**
   - Vẽ chuỗi 3–5 bước hình khối kiến trúc từ block đơn giản → phát triển không gian → tổ hợp khối hoàn chỉnh.
   - Lineart mảnh, nét đen, nền watercolor hồng nhạt bên dưới từng khối.
   - Mũi tên thể hiện quá trình phát triển.

3) **Bản đồ vị trí (Site Context Map)**
   - Bản đồ linework đơn giản.
   - Vị trí khu đất được tô highlight hồng pastel.
   - Tất cả nét vẽ giữ phong cách lineart mảnh, tinh tế.

4) **Exploded Axon hoặc 3D Diagram**
   - Tách các tầng (hoặc các khối chức năng) theo chiều đứng.
   - Đánh số 1–2–3 rõ ràng ở bên cạnh.
   - Giữ màu chủ đạo: lineart đen + nền hồng pastel.
   - Thêm cây, người scale nhỏ để tăng cảm giác không gian.

5) **Mặt cắt đơn giản (Section Diagram)**
   - Hai mặt cắt đứng tỉ lệ nhẹ, lineart đen, không shading.
   - Nhân vật dạng silhouette đen, thể hiện tỷ lệ.

6) **Perspective Rendering (Hình phối cảnh)**  
   - Phối cảnh ngoại thất (dựa trên ảnh đầu vào) theo phong cách:
     *tone màu hồng pastel, watercolor nhẹ, ánh sáng mềm*
     - Giữ nét lineart viền đen tinh tế trên toàn bộ công trình.
     - Phong cách giống bản vẽ minh hoạ kiến trúc kết hợp sketch + màu nước.

7) **Toàn bộ bố cục chung**
   - Phông nền sáng trắng.
   - Điểm nhấn màu watercolor hồng nhạt sau từng module.
   - Tỷ lệ bố cục thoáng, hiện đại, giống board kiến trúc chuyên nghiệp.
   - Không đổi hình học công trình gốc nếu dùng ảnh input (giữ nguyên layout, khối, vật liệu chính).

Phong cách tổng thể:  
Tối giản, lineart, soft shading, watercolor pastel, bố cục chuẩn A1 concept board, thể hiện quy trình thiết kế bài bản và trực quan.`;
          } else if (exteriorStyle === "Phong cách 2") {
              promptTemplate = `Tạo một bảng trình bày kiến trúc (Architectural Presentation Board) phong cách luxury màu beige – warm tone, giống các concept board cao cấp của resort & villa.
BỐ CỤC YÊU CẦU:
1) Tiêu đề lớn
   - “${projectName}”
   - Subtitle nhỏ: “${projectDesc}”
   - Font hiện đại, đậm, màu nâu đậm sang trọng.

2) Mô tả dự án
   - Đoạn văn 3–4 dòng giới thiệu khái niệm thiết kế, vật liệu chủ đạo, tinh thần công trình.
   - Viết phong cách luxury, tối giản, định hướng trải nghiệm.

3) Bộ hình minh họa tròn dọc bên trái
   - 4–5 hình nội thất hoặc chi tiết công trình liên quan, đặt trong khung hình tròn.
   - Viền mảnh, tone nâu – beige đồng bộ.

4) Sơ đồ SWOT
   - Bố trí theo dạng dọc:
     S – Strengths  
     W – Weaknesses  
     O – Opportunities  
     T – Threats  
   - Mỗi mục 1–2 dòng mô tả ngắn gọn bằng line text màu nâu đậm.

5) Sơ đồ vị trí / Mặt bằng tổng thể
   - Bản vẽ lineart rõ ràng, khối công trình highlight màu xanh lá pastel.
   - Background màu beige nhạt.

6) Danh sách bullet mô tả kỹ thuật
   - 8–12 bullet point: thông gió, cây xanh, mặt đứng, ban công, shading, vật liệu, circulation, landscape…

7) Hình phối cảnh ngoại thất chính
   - Render phong cách luxury Mediterranean/Modern Tropical (hoặc đúng phong cách công trình của bạn).
   - Ánh sáng chiều ấm, vật liệu gỗ – đá – mái ngói tone ấm.
   - Màu tổng thể: beige – vàng nhạt – nâu ấm, hơi film-like.

8) Mặt bằng kiến trúc (tùy chọn)
   - Bản vẽ 1–2 mặt bằng lineart đặt bên phải.
   - Phong cách minimal, nét mảnh, màu xám nhạt.

TẤT CẢ PHONG CÁCH:
   - Luxury beige concept board
   - Tone màu: beige, nâu ấm, vàng nhạt, atmospheric warm light
   - Lineart mảnh, sạch, tinh tế
   - Layout sang trọng, cân đối, mang cảm giác brochure kiến trúc cao cấp
   - Giữ đúng hình học công trình nếu dùng ảnh input (không thay đổi cấu trúc)

Xuất bản theo một trang bố cục hoàn chỉnh, tỷ lệ giống board mẫu.`;
          } else if (exteriorStyle === "Phong cách 3") {
              promptTemplate = `Tạo một moodboard kiến trúc cho ${projectName}, mô tả ngắn ${projectDesc}.
Bố cục trình bày sạch, tối giản, nền trắng, phong cách trình bày của studio kiến trúc chuyên nghiệp. Moodboard phải bao gồm đầy đủ các thành phần sau:
1. Ảnh phối cảnh chính (Hero Image)
Một ảnh mặt đứng hoặc góc tổng thể của công trình.
Ánh sáng tự nhiên, màu sắc trung tính, vật liệu chân thực.
Không méo hình, không thêm chi tiết lạ.
2. Sơ đồ tiến hóa khối (5 bước Massing Evolution)
Tạo 5 hình line-art tối giản gồm:
Khối đặc ban đầu
Khoét sân trong / tạo khoảng rỗng
Thêm lớp mặt đứng
Thêm ban công / lớp đệm
Thêm cây xanh – lam che – hoàn thiện khối kiến trúc
Phong cách vẽ: nét mảnh, monochrome, dạng diagram.
3. Bản vẽ kiến trúc (Line Drawing)
• Mặt bằng tầng điển hình (Typical Floor Plan)
• Mặt cắt dọc A-A (Vertical Cross Section)
• Axonometric tách tầng: Ground Floor – Upper Levels – Roof Level
Tất cả vẽ dạng đen trắng, mạch lạc, đúng kỹ thuật.
4. Ảnh không gian nội thất hoặc ban công (2–3 ảnh)
Render nội thất đúng vật liệu công trình.
Bố cục tự nhiên, ánh sáng mềm.
Không thay đổi layout.
5. Phong cách trình bày chung:
Nền trắng, chữ đen.
Bố cục dạng lưới (grid), khoảng cách rõ ràng.
Tiêu đề lớn, phụ đề nhỏ.
Tổng thể hiện đại, đơn giản, chuyên nghiệp.`;
          } else {
              alert("Phong cách chưa được hỗ trợ.");
              setIsMerging(false);
              return;
          }

          if (isPro) promptTemplate += " Output resolution 4K, highly detailed.";

          const supportedAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
          const validAspectRatio = supportedAspectRatios.includes(aspectRatio) ? aspectRatio : undefined;
          
          if (aspectRatio !== 'Auto' && !validAspectRatio) {
              promptTemplate += `\nEnsure the final image has an aspect ratio of ${aspectRatio}.`;
          }

          const parts = [
              { inlineData: { data: inputBase64, mimeType: exteriorInputImage.file.type } },
              { text: promptTemplate }
          ];

          const response = await apiClient.generateContent({
              model: getModelName('image'),
              contents: { parts },
              config: { 
                  responseModalities: ['IMAGE'],
                  ...( (isPro || validAspectRatio) ? {
                      imageConfig: {
                          ...getImageSize(isPro, proResolution),
                          ...(validAspectRatio ? { aspectRatio: validAspectRatio as any } : {})
                      }
                  } : {})
              },
          });

          const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
          if (imagePart && imagePart.inlineData) {
              const resultUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
              setGeneratedResults([resultUrl]);
              setHistory(prev => [{
                  id: Math.random().toString(36).substr(2, 9),
                  moodboardUrl: exteriorInputImage.url, 
                  contextUrl: "", 
                  resultUrl: resultUrl,
                  timestamp: Date.now()
              }, ...prev]);
              setCurrentPage(1);
          } else {
              throw new Error("Không có dữ liệu ảnh trả về.");
          }

      } catch (error) {
          console.error("Error generating exterior moodboard:", error);
          alert("Đã xảy ra lỗi trong quá trình tạo ảnh.");
      } finally {
          setIsMerging(false);
      }
  };

  // --- Handlers for Merging Interior (Main Action) ---
  const handleMergeMoodboard = async () => {
      if (!moodboardImage) {
          alert("Vui lòng có ảnh Moodboard (tải lên hoặc tự tạo).");
          return;
      }
      if (selectedBackgroundIds.length === 0) {
          alert("Vui lòng chọn ít nhất một ảnh bối cảnh (Mục 1) để ghép.");
          return;
      }

      setIsMerging(true);
      setGeneratedResults([]);
      setActiveTab('results');

      try {
        const moodboardBase64 = await blobToBase64(moodboardImage.file);
        
        for (const bgId of selectedBackgroundIds) {
            const bgImage = backgroundImages.find(img => img.id === bgId);
            if (!bgImage) continue;

            const bgBase64 = await blobToBase64(bgImage.file);

            let mergePrompt = `Sử dụng Ảnh 1 làm không gian mục tiêu cần thiết kế lại.  
Sử dụng Ảnh 2 làm moodboard tham chiếu phong cách hoàn chỉnh.

Mục tiêu:
Áp dụng toàn bộ phong cách – bảng màu – vật liệu – nội thất – ánh sáng – cảm xúc từ Ảnh 2 
vào không gian trong Ảnh 1, đồng thời GIỮ NGUYÊN hình học và kiến trúc gốc của Ảnh 1.
... (Rest of Interior Prompt) ...
8. KẾT QUẢ CUỐI
Xuất ra hình ảnh photorealistic của Ảnh 1, được cải tạo theo phong cách, bảng màu, vật liệu, 
nội thất và ánh sáng từ moodboard Ảnh 2.  
Kết quả phải tự nhiên, cao cấp, thống nhất, không phá vỡ kiến trúc gốc.`;

            const supportedAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
            const validAspectRatio = supportedAspectRatios.includes(aspectRatio) ? aspectRatio : undefined;
            
            if (aspectRatio !== 'Auto' && !validAspectRatio) {
                mergePrompt += `\nEnsure the final image has an aspect ratio of ${aspectRatio}.`;
            }

            const parts = [
                { inlineData: { data: bgBase64, mimeType: bgImage.file.type } }, // Image 1
                { text: "Ảnh 1: Không gian mục tiêu (Context)" },
                { inlineData: { data: moodboardBase64, mimeType: moodboardImage.file.type } }, // Image 2
                { text: "Ảnh 2: Moodboard tham chiếu" },
                { text: mergePrompt }
            ];

            const response = await apiClient.generateContent({
                model: getModelName('image'),
                contents: { parts },
                config: { 
                    responseModalities: ['IMAGE'],
                    ...( (isPro || validAspectRatio) ? {
                        imageConfig: {
                            ...getImageSize(isPro, proResolution),
                            ...(validAspectRatio ? { aspectRatio: validAspectRatio as any } : {})
                        }
                    } : {})
                },
            });

            const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
            if (imagePart && imagePart.inlineData) {
                const resultUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setGeneratedResults(prev => [...prev, resultUrl]);
                
                setHistory(prev => [{
                    id: Math.random().toString(36).substr(2, 9),
                    moodboardUrl: moodboardImage.url, 
                    contextUrl: bgImage.url,
                    resultUrl: resultUrl,
                    timestamp: Date.now()
                }, ...prev]);
                setCurrentPage(1);
            }
        }

      } catch (error) {
          console.error("Error merging moodboard:", error);
          alert("Đã xảy ra lỗi trong quá trình ghép ảnh.");
      } finally {
          setIsMerging(false);
      }
  };

  // Determine if we should show a single result view (fit frame) or grid
  const isSingleResultView = generatedResults.length === 1 && (moodboardMode === 'exterior' || selectedBackgroundIds.length <= 1);

  return (
    <>
    {zoomedImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
            <img 
                src={zoomedImage} 
                alt="Zoomed view" 
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10" 
                onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-4 right-4 flex items-center gap-3 z-[101]">
                <a href={zoomedImage} download={`[F9render.com]_moodboard-result-${Date.now()}.png`} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                    <ArrowDownTrayIcon className="w-6 h-6" />
                </a>
                <button onClick={() => setZoomedImage(null)} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    )}

    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-140px)]">
      {/* Left Sidebar */}
      <aside className="w-full lg:w-[400px] flex-shrink-0 bg-[#202633] border-r border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        {/* ... (Sidebar Content - No changes needed here) ... */}
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 group"
        >
          <div className="p-1 rounded-full group-hover:bg-slate-700">
            <ChevronLeftIcon className="w-5 h-5" />
          </div>
          <span className="font-semibold text-sm">Quay lại Kho tiện ích</span>
        </button>

        {/* Mode Toggles */}
        <div className="flex bg-[#364053] p-1 rounded-lg mb-2">
            <button
                onClick={() => setMoodboardMode('interior')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    moodboardMode === 'interior'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
            >
                Nội thất
            </button>
            <button
                onClick={() => setMoodboardMode('exterior')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    moodboardMode === 'exterior'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
            >
                Ngoại thất
            </button>
        </div>

        {moodboardMode === 'interior' ? (
            <>
                {/* 1. Background Images (Contexts) */}
                <div className="space-y-2">
                <h2 className="font-bold text-white text-base">1. Tải ảnh lên (Căn phòng trống)</h2>
                
                {backgroundImages.length === 0 ? (
                    <div 
                    className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-48 hover:border-blue-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group overflow-hidden"
                    onClick={() => backgroundFileInputRef.current?.click()}
                    >
                    <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400">
                        <div className="p-3 bg-slate-700/50 rounded-full mb-3">
                            <PhotoIcon className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-medium">Kéo và thả hoặc nhấp để tải lên</p>
                    </div>
                    </div>
                ) : (
                    <div className="bg-slate-800 p-3 rounded-lg max-h-48 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-3 gap-2">
                            {backgroundImages.map((img) => (
                                <div key={img.id} className="relative aspect-square group rounded-md overflow-hidden border border-gray-600">
                                    <img src={img.url} alt="Uploaded" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => removeBackgroundImage(img.id)}
                                        className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={() => backgroundFileInputRef.current?.click()}
                                className="aspect-square flex items-center justify-center bg-slate-700/50 rounded-md hover:bg-slate-700 border border-dashed border-gray-500 text-gray-400 hover:text-white transition-colors"
                            >
                                <span className="text-2xl">+</span>
                            </button>
                        </div>
                    </div>
                )}
                <input type="file" ref={backgroundFileInputRef} onChange={handleBackgroundUpload} className="hidden" accept="image/*" multiple />
                {backgroundImages.length === 0 && (
                    <button onClick={() => backgroundFileInputRef.current?.click()} className="w-full bg-[#364053] hover:bg-[#475266] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
                        Tải ảnh của bạn
                    </button>
                )}
                </div>

                {/* 2. Moodboard Asset */}
                <div className="space-y-3">
                <h2 className="font-bold text-white text-base">2. Thêm moodboard</h2>
                
                <div className="grid grid-cols-1 gap-3">
                    {/* Asset Upload Box - Full width */}
                    <div 
                        className="relative h-40 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-center hover:border-blue-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group overflow-hidden"
                        onClick={() => moodboardFileInputRef.current?.click()}
                    >
                        {moodboardImage ? (
                            <>
                                <img src={moodboardImage.url} alt="Moodboard Asset" className="w-full h-full object-cover" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); if(moodboardImage) URL.revokeObjectURL(moodboardImage.url); setMoodboardImage(null); if(moodboardFileInputRef.current) moodboardFileInputRef.current.value = ''; }} 
                                    className="absolute top-1 right-1 p-1 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors"
                                >
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-gray-500 px-2">
                                {isProcessing ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-1"></div>
                                ) : (
                                    <PhotoIcon className="w-6 h-6 mb-1" />
                                )}
                                <p className="text-[10px] leading-tight">
                                    {isProcessing ? 'Đang tạo...' : 'Kéo thả, dán, hoặc nhấp để tải lên'}
                                </p>
                            </div>
                        )}
                        <input type="file" ref={moodboardFileInputRef} onChange={handleMoodboardImageUpload} className="hidden" accept="image/*" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => handleGenerateMoodboardAsset()}
                        disabled={isProcessing}
                        className="w-full bg-[#364053] hover:bg-[#475266] text-white font-medium py-2 rounded-lg transition-colors text-xs disabled:opacity-50"
                    >
                        {isProcessing ? 'Đang tạo...' : 'Tạo ảnh moodboard'}
                    </button>
                    <button 
                        onClick={() => handleGenerateMoodboardAsset()}
                        disabled={isProcessing}
                        className="w-full bg-[#364053] hover:bg-[#475266] text-white font-medium py-2 rounded-lg transition-colors text-xs disabled:opacity-50"
                    >
                        Tự tạo moodboard
                    </button>
                </div>
                </div>

                {/* Chọn bối cảnh */}
                {backgroundImages.length > 0 && moodboardImage && (
                    <div className="space-y-2 pt-2 border-t border-gray-700">
                        <h2 className="font-bold text-white text-sm">Chọn bối cảnh</h2>
                        <div className="bg-[#364053] rounded-lg p-2 max-h-32 overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                {backgroundImages.map((img, idx) => (
                                    <label key={img.id} className="flex items-center gap-3 p-1.5 hover:bg-slate-700 rounded cursor-pointer transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedBackgroundIds.includes(img.id)} 
                                            onChange={() => toggleBackgroundSelection(img.id)}
                                            className="w-4 h-4 rounded border-gray-500 text-orange-500 focus:ring-orange-500 bg-gray-700"
                                        />
                                        <img src={img.url} alt="thumb" className="w-8 h-8 rounded object-cover bg-black" />
                                        <span className="text-xs text-gray-300">Ảnh {idx + 1}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Tỉ lệ khung hình */}
                <div className="space-y-2 pt-2 border-t border-gray-700">
                    <FilterDropdown 
                        label="3. Tỉ lệ khung hình"
                        options={['Auto', '1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9']}
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        placeholder="Auto"
                    />
                </div>

                {/* Main Action Button */}
                <div className="mt-auto pt-2">
                <button 
                    onClick={handleMergeMoodboard}
                    disabled={isMerging || !moodboardImage || selectedBackgroundIds.length === 0}
                    className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg uppercase tracking-wide text-sm disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isMerging ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                            Đang xử lý...
                        </>
                    ) : (
                        "GHÉP ẢNH MOODBOARD"
                    )}
                </button>
                </div>
            </>
        ) : (
            <>
                {/* 1. Upload Context (Exterior) */}
                <div className="space-y-2">
                    <h2 className="font-bold text-white text-base"> Tải ảnh lên (Công trình)</h2>
                    
                    <div 
                        className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-40 hover:border-blue-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group"
                        onClick={() => exteriorFileInputRef.current?.click()}
                    >
                        {exteriorInputImage ? (
                            <>
                                <img src={exteriorInputImage.url} alt="Exterior Input" className="max-h-full max-w-full object-contain rounded-md" />
                                <button 
                                    onClick={clearExteriorImage}
                                    className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                >
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400">
                                <div className="p-3 bg-slate-700/50 rounded-full mb-3">
                                    <PhotoIcon className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-medium">Kéo và thả hoặc nhấp để tải lên</p>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={exteriorFileInputRef} onChange={handleExteriorImageUpload} className="hidden" accept="image/*" />
                    {!exteriorInputImage && (
                        <button onClick={() => exteriorFileInputRef.current?.click()} className="w-full bg-[#364053] hover:bg-[#475266] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
                            Tải ảnh của bạn
                        </button>
                    )}
                </div>

                {/* Project Name */}
                <div className="space-y-2">
                    <label className="font-bold text-white text-sm">Tên công trình/ Dự án</label>
                    <input 
                        type="text" 
                        value={exteriorProjectName}
                        onChange={(e) => setExteriorProjectName(e.target.value)}
                        placeholder="Nhập tên Công trình hoặc dự án tại đây." 
                        className="w-full bg-[#364053] border border-gray-600 text-white rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
                    />
                </div>

                {/* 2. Description */}
                <div className="space-y-2">
                    <h2 className="font-bold text-white text-base"> Mô tả về công trình/ Dự án</h2>
                    <textarea 
                        rows={4} 
                        value={exteriorDescription}
                        onChange={(e) => setExteriorDescription(e.target.value)}
                        placeholder="Mô tả ngắn về công trình..." 
                        className="w-full bg-[#364053] border border-gray-600 text-white rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder-gray-500"
                    ></textarea>
                </div>

                {/* Style Selection */}
                <div className="space-y-2">
                    <FilterDropdown 
                        label="Phong cách thiết kế Moodbroad"
                        options={["Phong cách 1", "Phong cách 2", "Phong cách 3"]}
                        value={exteriorStyle}
                        onChange={setExteriorStyle}
                        placeholder="Lựa chọn 1 mẫu có sẵn"
                    />
                </div>

                {/* 3. Tỉ lệ khung hình */}
                <div className="space-y-2 pt-2 border-t border-gray-700">
                    <FilterDropdown 
                        label="3. Tỉ lệ khung hình"
                        options={['Auto', '1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9']}
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        placeholder="Auto"
                    />
                </div>

                {/* Main Action Button */}
                <div className="mt-auto pt-4">
                    <button 
                        onClick={handleGenerateExteriorMoodboard}
                        disabled={isMerging || !exteriorInputImage || !exteriorStyle}
                        className="w-full bg-[#4b5563] hover:bg-[#586375] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg uppercase tracking-wide text-sm flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {isMerging ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                Đang xử lý...
                            </>
                        ) : (
                            "TẠO ẢNH MOODBOARD"
                        )}
                    </button>
                </div>
            </>
        )}
      </aside>

      {/* Right Main Content */}
      <main className="flex-grow flex flex-col bg-[#282f3d]">
        <div className="flex border-b border-gray-700 px-6 pt-4 gap-6">
          <button 
            onClick={() => setActiveTab('results')}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'results' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          >
            Kết quả
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'history' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          >
            Lịch sử
          </button>
        </div>

        <div className="flex-grow p-6 h-full min-h-0 overflow-y-auto custom-scrollbar">
          {activeTab === 'results' ? (
            <div className="w-full h-full">
                {isMerging && generatedResults.length === 0 ? (
                    <div className="w-full h-full bg-[#202633] rounded-xl border border-gray-700/50 flex flex-col items-center justify-center">
                        <div className="relative w-20 h-20 mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-orange-500/30"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
                        </div>
                        <p className="text-gray-300 animate-pulse font-medium">Đang ghép moodboard...</p>
                    </div>
                ) : generatedResults.length > 0 ? (
                    isSingleResultView ? (
                        // Single Result View (Fit Frame)
                        <div className="w-full h-full bg-[#202633] rounded-xl border border-gray-700/50 flex items-center justify-center relative overflow-hidden group">
                            <img src={generatedResults[0]} alt="Result" className="max-w-full max-h-full object-contain shadow-2xl" />
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-2 rounded-full px-4">
                                <button onClick={() => setZoomedImage(generatedResults[0])} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to">
                                    <MagnifyingGlassPlusIcon className="w-6 h-6" />
                                </button>
                                <div className="w-px h-6 bg-white/20"></div>
                                <a href={generatedResults[0]} download={`[F9render]_moodboard-result-${Date.now()}.png`} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Tải xuống">
                                    <ArrowDownTrayIcon className="w-6 h-6" />
                                </a>
                            </div>
                        </div>
                    ) : (
                        // Grid View
                        <div className="grid grid-cols-1 items-start gap-4">
                            {generatedResults.map((resUrl, index) => (
                                <div key={index} className="relative group bg-black/20 rounded-xl overflow-hidden flex items-center justify-center border border-gray-700 hover:border-orange-500/50 transition-colors w-full h-auto">
                                    <img src={resUrl} alt={`Result ${index + 1}`} className="w-full h-auto object-contain" />
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-2 rounded-full px-4">
                                        <button onClick={() => setZoomedImage(resUrl)} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to">
                                            <MagnifyingGlassPlusIcon className="w-6 h-6" />
                                        </button>
                                        <div className="w-px h-6 bg-white/20"></div>
                                        <a href={resUrl} download={`[F9render]_result-${index}.png`} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Tải xuống">
                                            <ArrowDownTrayIcon className="w-6 h-6" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                            {isMerging && (
                                <div className="bg-[#202633] rounded-xl border border-dashed border-gray-600 flex flex-col items-center justify-center w-full aspect-video">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
                                    <p className="text-xs text-gray-400">Đang tạo thêm...</p>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    <div className="w-full h-full bg-[#202633] rounded-xl border border-gray-700/50 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <RectangleGroupIcon className="w-10 h-10 text-gray-600" />
                            </div>
                            <h3 className="text-gray-400 font-semibold text-lg mb-2">Chưa có kết quả</h3>
                            <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                Tải ảnh nền, tạo moodboard và nhấn "Ghép ảnh Moodboard" để bắt đầu.
                            </p>
                        </div>
                    </div>
                )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
                {history.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                        <p>Chưa có lịch sử</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar flex-grow content-start pr-2 items-start">
                            {paginatedHistory.map((item) => (
                                <div key={item.id} className="bg-[#202633] p-3 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors group">
                                    <div className="relative w-full h-auto rounded-lg overflow-hidden mb-2">
                                        <img src={item.resultUrl} alt="Result" className="w-full h-auto object-contain bg-black/20" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                             <button onClick={() => setZoomedImage(item.resultUrl)} className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30">
                                                <MagnifyingGlassPlusIcon className="w-5 h-5" />
                                            </button>
                                            <a href={item.resultUrl} download={`moodboard-${item.timestamp}.png`} className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30">
                                                <ArrowDownTrayIcon className="w-5 h-5" />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className="flex -space-x-2 overflow-hidden flex-shrink-0">
                                            {item.moodboardUrl && <img src={item.moodboardUrl} className="inline-block h-6 w-6 rounded-full ring-2 ring-[#202633] object-cover bg-white" title="Input" />}
                                            {item.contextUrl && <img src={item.contextUrl} className="inline-block h-6 w-6 rounded-full ring-2 ring-[#202633] object-cover bg-white" title="Context" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex-shrink-0">
                             <Pagination 
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </>
                )}
            </div>
          )}
        </div>
      </main>
    </div>
    </>
  );
};

export default CreateMoodboard;
