import React, { useState, useRef } from 'react';
import { useLanguage } from './hooks/useLanguage';
import { useMode } from './contexts/ModeContext';
import { useSnow } from './contexts/SnowContext';
import { useApiKey } from './contexts/ApiKeyContext';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { BoltIcon } from './components/icons/BoltIcon';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import Footer from './components/Footer';
import LanguageSwitcher from './components/LanguageSwitcher';
import Pagination from './components/Pagination';
import OnlineStatus from './components/OnlineStatus';
import { apiClient, getImageSize } from './lib/api';

interface PromptLibraryPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNavigate: (page: string, data?: any) => void;
}

interface PromptItem {
  title: string;
  description: string;
  imageUrl: string;
  defaultPrompt?: string;
}

const PromptLibraryPage: React.FC<PromptLibraryPageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { mode, toggleMode, getModelName, isPro, proResolution } = useMode();
  const { isSnowing, toggleSnow } = useSnow();
  const { isKeySet, showKeyModal } = useApiKey();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PromptItem | null>(null);

  // Generation states
  const [activeInputFile, setActiveInputFile] = useState<File | null>(null);
  const [displayInputImage, setDisplayInputImage] = useState<string | null>(null);
  const [materials, setMaterials] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('auto');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [history, setHistory] = useState<{ input: string, outputs: string[] }[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [hoveredThumbnail, setHoveredThumbnail] = useState<string | null>(null);
  
  // New states
  const [selectedCameraAngle, setSelectedCameraAngle] = useState<string>('');
  const [isSuggestingMaterials, setIsSuggestingMaterials] = useState<boolean>(false);
  const [historyCurrentPage, setHistoryCurrentPage] = useState<number>(1);
  const HISTORY_PER_PAGE = 5;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleDownload = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const actionButtons = [
    { id: 'exterior', key: 'imageGenerationPage.actionButtons.exterior' },
    { id: 'interior', key: 'imageGenerationPage.actionButtons.interior' },
    { id: 'newAngle', key: 'imageGenerationPage.actionButtons.newAngle' },
    { id: 'zoom', key: 'imageGenerationPage.actionButtons.zoom' },
    { id: 'edit', key: 'imageGenerationPage.actionButtons.edit' },
    { id: 'sharpen', key: 'imageGenerationPage.actionButtons.sharpen' },
    { id: 'toVideo', key: 'imageGenerationPage.actionButtons.toVideo' },
    { id: 'utils', key: 'imageGenerationPage.actionButtons.utils' },
  ];
  const mainActionButtons = actionButtons.slice(0, 2);
  const subActionButtons = actionButtons.slice(2);

  const handleActionChange = (id: string) => {
    onNavigate('image-generation', { page: 'image-generation', config: { activeAction: id } });
  };

  const VIEW_GROUPS = [
    {
      name: t('promptLibraryPage.views.wide', 'I. Nhóm Toàn cảnh (Wide Shots)'),
      views: [
        { id: 'wide-1', name: t('promptLibraryPage.views.items.wide-1', 'Toàn cảnh 1 (Bình minh)'), prompt: 'Wide-angle lens, clear morning light, soft morning mist, peaceful and serene atmosphere, fresh colors. High resolution 8K, photorealistic architectural photography.' },
        { id: 'wide-2', name: t('promptLibraryPage.views.items.wide-2', 'Toàn cảnh 2 (Hoàng hôn)'), prompt: 'Wide-angle lens, vibrant golden hour lighting, orange and purple clouds in the sky, dramatic long shadows, warm and emotional atmosphere. High resolution 8K, photorealistic architectural photography.' },
      ]
    },
    {
      name: t('promptLibraryPage.views.medium', 'II. Nhóm Trung cảnh (Medium Shots)'),
      views: [
        { id: 'medium-1', name: t('promptLibraryPage.views.items.medium-1', 'Trung cảnh 1 (Góc chính diện)'), prompt: 'Eye-level frontal view, balanced composition, clear view of the main facade. High resolution 8K, photorealistic architectural photography.' },
        { id: 'medium-2', name: t('promptLibraryPage.views.items.medium-2', 'Trung cảnh 2 (Góc 3/4 bên trái)'), prompt: '3/4 perspective view from the left side, showing depth and the relationship between front and side facades. High resolution 8K, photorealistic architectural photography.' },
        { id: 'medium-3', name: t('promptLibraryPage.views.items.medium-3', 'Trung cảnh 3 (Góc 3/4 bên phải)'), prompt: '3/4 perspective view from the right side, showing depth and the relationship between front and side facades. High resolution 8K, photorealistic architectural photography.' },
        { id: 'medium-4', name: t('promptLibraryPage.views.items.medium-4', 'Trung cảnh 4 (Lối vào chính)'), prompt: 'Medium shot focusing on the main entrance and lobby area, inviting perspective, clear view of the transition between outside and inside. High resolution 8K, photorealistic architectural photography.' },
        { id: 'medium-5', name: t('promptLibraryPage.views.items.medium-5', 'Trung cảnh 5 (Chi tiết kiến trúc)'), prompt: 'Medium-close shot focusing on a specific architectural feature or material intersection. High resolution 8K, photorealistic architectural photography.' },
      ]
    },
    {
      name: t('promptLibraryPage.views.artistic', 'III. Nhóm Nghệ thuật (Artistic Shots)'),
      views: [
        { id: 'art-1', name: t('promptLibraryPage.views.items.art-1', 'Nghệ thuật 1 (Xóa phông tiền cảnh)'), prompt: 'Artistic composition with shallow depth of field. Foreground objects like leaves or a character are softly blurred, while the building remains perfectly sharp in the background. Cinematic feel. High resolution 8K, photorealistic architectural photography.' },
        { id: 'art-2', name: t('promptLibraryPage.views.items.art-2', 'Nghệ thuật 2 (Phối cảnh đêm)'), prompt: 'Night perspective with glowing interior and exterior lighting. Warm lights contrasting with the deep blue or black night sky. Sparkling and magical atmosphere. High resolution 8K, photorealistic architectural photography.' },
        { id: 'art-3', name: t('promptLibraryPage.views.items.art-3', 'Nghệ thuật 3 (Phản chiếu)'), prompt: 'Artistic shot focusing on reflections of the building on glass or water surfaces. Symmetrical or abstract composition. High resolution 8K, photorealistic architectural photography.' },
      ]
    },
    {
      name: t('promptLibraryPage.views.upward', 'IV. Nhóm Ngước nhìn (Upward Angle)'),
      views: [
        { id: 'upward-1', name: t('promptLibraryPage.views.items.upward-1', 'Ngước nhìn từ dưới lên'), prompt: 'Dramatic low-angle shot looking up at the building, emphasizing height, scale, and grandeur. High resolution 8K, photorealistic architectural photography.' },
      ]
    },
    {
      name: t('promptLibraryPage.views.drone', 'V. Nhóm Drone (Drone Angle)'),
      views: [
        { id: 'drone-1', name: t('promptLibraryPage.views.items.drone-1', 'Drone (Cao & bên hông)'), prompt: 'High altitude drone view from a side perspective, showing the building in its urban or natural context. High resolution 8K, photorealistic architectural photography.' },
      ]
    }
  ];

  const libraryCards = [
    {
      title: t("promptLibraryPage.categories.townHouse.title", "Nhà Phố"),
      description: t("promptLibraryPage.categories.townHouse.description", "Khám phá các mẫu thiết kế nhà phố hiện đại, tối ưu diện tích."),
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: t("promptLibraryPage.categories.villa.title", "Biệt Thự"),
      description: t("promptLibraryPage.categories.villa.description", "Các công trình biệt thự đẳng cấp, sân vườn và phong cách tân cổ điển."),
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: t("promptLibraryPage.categories.interior.title", "Nội Thất"),
      description: t("promptLibraryPage.categories.interior.description", "Ý tưởng không gian sống tinh tế từ phòng khách đến phòng ngủ."),
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    }
  ];

  const nhaPhoItems: PromptItem[] = [
    {
      title: t("promptLibraryPage.categories.townHouse.items.item1.title", "Mẫu nhà phố 1"),
      description: t("promptLibraryPage.categories.townHouse.items.item1.description", "Prompt mẫu nhà phố kiến trúc hiện đại 1"),
      imageUrl: "https://i.ibb.co/39b7H18S/617662778-1852561475734147-6334751143682874560-n.jpg",
      defaultPrompt: t("promptLibraryPage.categories.townHouse.items.item1.defaultPrompt", "Ảnh thực tế của công trình Kiến trúc nhiệt đới hiện đại, ưu tiên không gian xanh và vật liệu tự nhiên., phong cách Hiện đại – Nhiệt đới.\nBối cảnh tại Tọa lạc trong một khu dân cư đô thị.\n{Vật liệu ứng dụng }\nKhông gian xung quanh bao gồm Hệ thống cây xanh đa dạng trên các ban công, Hai cây lớn xanh tốt ở hai bên vỉa hè, hài hòa with cảnh quan tự nhiên.\nPhía xa là Bầu trời u ám, tạo chiều sâu thị giác và cảm giác không gian mở rộng.\nKhung cảnh được ghi lại vào Mùa hè, cây cối tươi tốt và đầy sức sống., Giữa ngày., trong điều kiện thời tiết Trời nhiều mây, ánh sáng dịu và khuếch tán..\nÁnh sáng tự nhiên cân bằng, phản chiếu mềm, vật liệu hiện rõ chi tiết.\nKhông khí tổng thể mang cảm xúc Yên bình, tươi mát và thân thiện..\nGóc nhìn máy ảnh là Chụp thẳng from phía bên kia đường, ngang tầm mắt, lấy trọn vẹn mặt tiền ngôi nhà., sử dụng DSLR full-frame with ống kính góc rộng, DOF nhẹ nhàng, và bố cục theo tỉ lệ vàng.")
    },
    {
      title: t("promptLibraryPage.categories.townHouse.items.item2.title", "Mẫu nhà phố 2"),
      description: t("promptLibraryPage.categories.townHouse.items.item2.description", "Prompt mẫu nhà phố kiến trúc hiện đại 2"),
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: t("promptLibraryPage.categories.townHouse.items.item3.title", "Mẫu nhà phố 3"),
      description: t("promptLibraryPage.categories.townHouse.items.item3.description", "Prompt mẫu nhà phố kiến trúc hiện đại 3"),
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: t("promptLibraryPage.categories.townHouse.items.item4.title", "Mẫu nhà phố 4"),
      description: t("promptLibraryPage.categories.townHouse.items.item4.description", "Prompt mẫu nhà phố kiến trúc hiện đại 4"),
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: t("promptLibraryPage.categories.townHouse.items.item5.title", "Nhà phố hiện đại"),
      description: t("promptLibraryPage.categories.townHouse.items.item5.description", "Prompt mẫu nhà phố phong cách hiện đại"),
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: t("promptLibraryPage.categories.townHouse.items.item6.title", "Nhà phố tối giản"),
      description: t("promptLibraryPage.categories.townHouse.items.item6.description", "Prompt mẫu nhà phố phong cách tối giản"),
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: t("promptLibraryPage.categories.townHouse.items.item7.title", "Nhà phố nhiệt đới"),
      description: t("promptLibraryPage.categories.townHouse.items.item7.description", "Prompt mẫu nhà phố phong cách nhiệt đới"),
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: t("promptLibraryPage.categories.townHouse.items.item8.title", "Nhà phố thương mại"),
      description: t("promptLibraryPage.categories.townHouse.items.item8.description", "Prompt mẫu nhà phố thương mại kết hợp kinh doanh"),
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    }
  ];

  const bietThuItems: PromptItem[] = [
    {
      title: t("promptLibraryPage.categories.villa.items.item1.title", "Biệt thự tân cổ điển"),
      description: t("promptLibraryPage.categories.villa.items.item1.description", "Prompt mẫu biệt thự phong cách tân cổ điển sang trọng"),
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: t("promptLibraryPage.categories.villa.items.item2.title", "Biệt thự hiện đại"),
      description: t("promptLibraryPage.categories.villa.items.item2.description", "Prompt mẫu biệt thự hiện đại với không gian mở"),
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: t("promptLibraryPage.categories.villa.items.item3.title", "Biệt thự nhà vườn"),
      description: t("promptLibraryPage.categories.villa.items.item3.description", "Prompt mẫu biệt thự kết hợp cảnh quan sân vườn"),
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: t("promptLibraryPage.categories.villa.items.item4.title", "Biệt thự nghỉ dưỡng"),
      description: t("promptLibraryPage.categories.villa.items.item4.description", "Prompt mẫu biệt thự nghỉ dưỡng cao cấp (Resort villa)"),
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: t("promptLibraryPage.categories.villa.items.item5.title", "Biệt thự mái Thái"),
      description: t("promptLibraryPage.categories.villa.items.item5.description", "Prompt mẫu biệt thự mái Thái truyền thống"),
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: t("promptLibraryPage.categories.villa.items.item6.title", "Biệt thự mái Nhật"),
      description: t("promptLibraryPage.categories.villa.items.item6.description", "Prompt mẫu biệt thự mái Nhật tối giản"),
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: t("promptLibraryPage.categories.villa.items.item7.title", "Biệt thự mini"),
      description: t("promptLibraryPage.categories.villa.items.item7.description", "Prompt mẫu biệt thự mini diện tích nhỏ gọn"),
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: t("promptLibraryPage.categories.villa.items.item8.title", "Biệt thự song lập"),
      description: t("promptLibraryPage.categories.villa.items.item8.description", "Prompt mẫu biệt thự song lập đối xứng"),
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    }
  ];

  const noiThatItems: PromptItem[] = [
    {
      title: t("promptLibraryPage.categories.interior.items.item1.title", "Phòng khách hiện đại"),
      description: t("promptLibraryPage.categories.interior.items.item1.description", "Prompt mẫu phòng khách phong cách hiện đại, tối giản"),
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Phòng ngủ ấm cúng",
      description: "Prompt mẫu phòng ngủ với ánh sáng vàng ấm áp",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Nhà bếp tiện nghi",
      description: "Prompt mẫu không gian bếp đảo hiện đại",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Phòng tắm sang trọng",
      description: "Prompt mẫu phòng tắm ốp đá vân mây cao cấp",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Phòng làm việc",
      description: "Prompt mẫu phòng làm việc tại nhà sáng tạo",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Nội thất tân cổ điển",
      description: "Prompt mẫu nội thất chi tiết phào chỉ tân cổ điển",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Nội thất Indochine",
      description: "Prompt mẫu nội thất phong cách Đông Dương",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Nội thất Wabi Sabi",
      description: "Prompt mẫu nội thất phong cách Wabi Sabi mộc mạc",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    }
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (displayInputImage) URL.revokeObjectURL(displayInputImage);
      const url = URL.createObjectURL(file);
      setDisplayInputImage(url);
      setActiveInputFile(file);
    }
  };


  const handleSuggestMaterials = async () => {
    if (!activeInputFile) {
        alert(t("aiAssistant.error", "Vui lòng tải ảnh lên trước!"));
        return;
    }
    
    setIsSuggestingMaterials(true);
    try {
        const inputBase64 = await blobToBase64(activeInputFile);
        const prompt = "Phân tích hình ảnh kiến trúc đầu vào. Xác định và liệt kê tất cả vật liệu ứng dụng được nhìn thấy. Đối với mỗi vật liệu, hãy cung cấp mô tả chi tiết bao gồm loại vật liệu, đặc điểm bề mặt (ví dụ: mờ, bóng, nhám) và mức độ phản sáng (ví dụ: thấp, trung bình, cao), hoàn thiện mô tả như vật liệu thực tế. Tuyệt đối KHÔNG gộp nhiều vật liệu vào một mô tả duy nhất. Mỗi vật liệu nhìn thấy được trên bất kỳ bề mặt kiến trúc nào (tường, sàn, trần, mái, cột, lan can, mặt đứng, chi tiết trang trí, v.v.) PHẢI được mô tả thành một phần tử JSON độc lập, ngay cả khi chúng cùng tồn tại trên một bề mặt hoặc cấu kiện. Trả về kết quả dưới dạng một mảng JSON chứa các chuỗi ký tự, mỗi chuỗi là một mô tả vật liệu hoàn chỉnh.";
        
        const response = await apiClient.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { data: inputBase64, mimeType: activeInputFile.type } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const textResp = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResp) {
            try {
                // Parse the array of strings and combine them
                const materialsArr = JSON.parse(textResp);
                if (Array.isArray(materialsArr)) {
                    setMaterials(materialsArr.join(", "));
                }
            } catch (e) {
                console.error("Failed to parse JSON", e);
                setMaterials(textResp);
            }
        }
    } catch (e) {
        console.error("Error suggesting materials", e);
    } finally {
        setIsSuggestingMaterials(false);
    }
  };

  const handleGenerate = async () => {
    if (!activeInputFile || !selectedItem?.defaultPrompt) return;

    if (isPro && !isKeySet) {
      showKeyModal();
      return;
    }

    setIsLoading(true);
    setGeneratedImages([]);
    setActiveTab('results');

    try {
      const inputBase64 = await blobToBase64(activeInputFile);
      
      let finalPrompt = selectedItem.defaultPrompt || "Kiến trúc công trình chuyên nghiệp theo bức ảnh tham chiếu tải lên.";

      if (materials.trim()) {
        if (finalPrompt.includes('{Vật liệu ứng dụng }')) {
          finalPrompt = finalPrompt.replace('{Vật liệu ứng dụng }', materials.trim());
        } else {
          finalPrompt += ` \nSử dụng các thiết kế vật liệu sau: ${materials.trim()}.`;
        }
      } else {
        if (finalPrompt.includes('{Vật liệu ứng dụng }')) {
          finalPrompt = finalPrompt.replace('{Vật liệu ứng dụng }', 'Công trình sử dụng vật liệu như ảnh tải lên.');
        }
      }
      
      // Apply Camera angle
      if (selectedCameraAngle) {
        finalPrompt += " " + selectedCameraAngle;
      } else {
        finalPrompt += " Giữ nguyên góc nhìn như ảnh tải lên,không thay đổi";
      }


      const generateOneImage = async () => {
        const response = await apiClient.generateContent({
          model: getModelName('image'),
          contents: {
            parts: [
              { inlineData: { data: inputBase64, mimeType: activeInputFile.type } },
              { text: finalPrompt }
            ]
          },
          config: { 
            responseModalities: ['IMAGE'],
            imageConfig: {
              ...(aspectRatio !== "auto" ? { aspectRatio: aspectRatio } : {}),
              ...getImageSize(isPro, proResolution)
            }
          },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find((part: any) => part.inlineData);
        if (imagePart && imagePart.inlineData) {
          return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }
        return null;
      };

      const generationPromises = Array.from({ length: numberOfImages }, () => generateOneImage());
      const results = await Promise.all(generationPromises);
      const successfulImages = results.filter((img): img is string => img !== null);

      if (successfulImages.length > 0) {
        setGeneratedImages(successfulImages);
        setHistory(prev => [{ input: displayInputImage!, outputs: successfulImages }, ...prev]);
      } else {
        console.error("Rendering failed: No image generated.");
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      let errorMsg = "Có lỗi xảy ra khi tạo ảnh. Vui lòng thử lại.";
      if (error.message?.includes("permission denied") || error.message?.includes("403") || error.message?.includes("404") || error.message?.includes("Requested entity was not found")) {
          errorMsg = "Lỗi quyền truy cập: Vui lòng chọn API Key từ dự án có tính phí (Paid Project) để sử dụng mô hình tạo ảnh cao cấp.";
          showKeyModal();
      }
      alert(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPromptDetail = () => {
    if (!selectedItem) return null;

    return (
      <div className="max-w-full px-4 lg:px-8 mx-auto w-full h-full flex flex-col animate-fade-in">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
          <button onClick={() => { setSelectedCategory(null); setSelectedItem(null); }} className="hover:text-white transition-colors">{t('promptLibraryPage.backToLibrary', 'Thư viện')}</button>
          <span>/</span>
          <button onClick={() => setSelectedItem(null)} className="hover:text-white transition-colors uppercase">{selectedCategory}</button>
          <span>/</span>
          <span className="text-white font-bold uppercase">{selectedItem.title}</span>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6 flex-grow min-h-0">
          {/* Left Sidebar */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6 bg-[#1e293b] p-4 rounded-xl border border-slate-700 overflow-y-auto custom-scrollbar">
            {/* 1. Ảnh đầu vào */}
            <div>
              <h3 className="text-white font-bold mb-2">1. Ảnh đầu vào</h3>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400 hover:border-orange-500 hover:text-orange-500 transition-colors cursor-pointer bg-[#2a303c] relative overflow-hidden min-h-[200px]"
              >
                {displayInputImage ? (
                  <img src={displayInputImage} alt="Input" className="absolute inset-0 w-full h-full object-contain" />
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">Tải ảnh của bạn</span>
                  </>
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="w-full mt-2 bg-[#3b4252] hover:bg-[#4c566a] text-white py-2 rounded-lg transition-colors text-sm font-medium">
                Tải ảnh của bạn
              </button>
            </div>

            {/* Vật liệu ứng dụng */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-bold text-sm">Vật liệu ứng dụng <span className="text-red-500">* Bắt buộc</span></h3>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-orange-400 mb-1">Gợi ý sử dụng</span>
                  <button onClick={handleSuggestMaterials} disabled={isSuggestingMaterials} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-xs text-white transition-colors disabled:opacity-50">
                    <SparklesIcon className="w-3 h-3" /> {isSuggestingMaterials ? t("promptLibraryPage.suggestingMaterials", "Đang gợi ý...") : t("promptLibraryPage.suggestMaterials", "AI Gợi ý")}
                  </button>
                </div>
              </div>
              <div className="bg-[#2a303c] border border-slate-600 rounded-lg p-2 min-h-[80px] flex flex-col gap-2">
                <input 
                  type="text" 
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder="Nhập vật liệu (VD: Gỗ ốp tường, kính cường lực...)"
                  className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-gray-500"
                />
                <div className="flex flex-wrap gap-2">
                  {materials && (
                    <div className="inline-flex items-center gap-1 bg-orange-600/80 text-white px-2 py-1 rounded text-xs">
                      {materials}
                      <button onClick={() => setMaterials('')} className="hover:text-red-300 ml-1">×</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tỉ lệ khung hình */}
            <div>
              <h3 className="text-white font-bold mb-2 text-sm">Tỉ lệ khung hình</h3>
              <select 
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-[#2a303c] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="Auto">Tự động</option>
                <option value="Auto">Theo ảnh gốc (Source Image)</option>
                <option value="1:1">Vuông (1:1)</option>
                <option value="4:3">Ngang (4:3)</option>
                <option value="3:4">Dọc (3:4)</option>
                <option value="3:2">Ngang (3:2)</option>
                <option value="2:3">Dọc (2:3)</option>
                <option value="7:5">Ngang (7:5)</option>
                <option value="5:7">Dọc (5:7)</option>
                <option value="16:9">Ngang (16:9)</option>
                <option value="9:16">Dọc (9:16)</option>
                <option value="21:9">Siêu rộng (21:9)</option>
              </select>
            </div>


            {/* Góc nhìn Camera */}
            <div>
              <h3 className="text-white font-bold mb-2 text-sm">{t("promptLibraryPage.cameraAngle", "Góc chụp / Góc nhìn Camera")}</h3>
              <select 
                value={selectedCameraAngle}
                onChange={(e) => setSelectedCameraAngle(e.target.value)}
                className="w-full bg-[#2a303c] border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="">{t("promptLibraryPage.defaultCameraAngle", "Tự động (Giữ nguyên góc nhìn như ảnh)")}</option>
                {Array.isArray(t('imageGenerationPage.sidebar.cameraAngleSuggestions', { returnObjects: true })) && 
                 (t('imageGenerationPage.sidebar.cameraAngleSuggestions', { returnObjects: true }) as string[]).map((angle, idx) => (
                    <option key={idx} value={angle}>{angle}</option>
                ))}
              </select>
            </div>

            {/* Số lượng ảnh kết quả */}
            <div>
              <h3 className="text-white font-bold mb-2 text-sm">Số lượng ảnh kết quả</h3>
              <div className="flex items-center justify-between bg-[#2a303c] border border-slate-600 rounded-lg px-3 py-2">
                <button onClick={() => setNumberOfImages(Math.max(1, numberOfImages - 1))} className="text-gray-400 hover:text-white px-2">-</button>
                <span className="text-white font-bold">{numberOfImages}</span>
                <button onClick={() => setNumberOfImages(Math.min(4, numberOfImages + 1))} className="text-gray-400 hover:text-white px-2">+</button>
              </div>
            </div>

            {/* Tạo Ảnh ngay */}
            <button 
              onClick={handleGenerate}
              disabled={!activeInputFile || isLoading}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-orange-500 hover:to-red-600 text-white font-bold py-3 rounded-lg transition-all duration-300 mt-auto disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "Tạo Ảnh ngay"
              )}
            </button>
          </div>

          {/* Right Main Area */}
          <div className="w-full lg:w-2/3 flex flex-col bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
            <div className="flex border-b border-slate-700">
              <button 
                onClick={() => setActiveTab('results')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'results' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'}`}
              >
                Kết quả
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'history' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'}`}
              >
                Lịch sử
              </button>
            </div>
            <div className="flex-grow bg-[#151b28] p-4 flex items-center justify-center overflow-y-auto">
              {activeTab === 'results' ? (
                generatedImages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full h-full content-center justify-items-center">
                    {generatedImages.map((img, idx) => (
                      <div key={idx} className="relative flex items-center justify-center w-full h-full bg-black/20 rounded-lg border border-slate-700 p-2 group">
                        <img 
                          src={img} 
                          alt={`Generated ${idx}`} 
                          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setZoomedImage(img)}
                        />
                        <a 
                          href={img} 
                          download={`[f9render.com]_image_${idx + 1}.png`}
                          className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Tải xuống
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 flex flex-col items-center">
                    <SparklesIcon className="w-12 h-12 mb-2 opacity-20" />
                    <p>Hình ảnh kết quả sẽ hiển thị ở đây</p>
                  </div>
                )
              ) : (
                history.length > 0 ? (
                  <div className="flex flex-col gap-6 w-full h-full content-start">
                    <div className="flex flex-col gap-6 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                    {paginatedHistory.map((item, idx) => (
                      <div key={idx} className="bg-[#2a303c] p-4 rounded-lg border border-slate-700">
                        <div className="flex gap-4">
                          <div className="w-1/3">
                            <p className="text-xs text-gray-400 mb-1">Ảnh gốc</p>
                            <img src={item.input} alt="History Input" className="w-full h-auto rounded border border-slate-600" />
                          </div>
                          <div className="w-2/3">
                            <p className="text-xs text-gray-400 mb-1">Kết quả</p>
                            <div className="grid grid-cols-2 gap-2">
                              {item.outputs.map((outImg, outIdx) => (
                                <img 
                                  key={outIdx} 
                                  src={outImg} 
                                  alt={`History Output ${outIdx}`} 
                                  className="w-full h-auto rounded border border-slate-600 cursor-pointer hover:opacity-90 transition-opacity" 
                                  onClick={() => setZoomedImage(outImg)}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                    {totalHistoryPages > 1 && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <Pagination 
                            currentPage={historyCurrentPage} 
                            totalPages={totalHistoryPages} 
                            onPageChange={(page) => {
                                setHistoryCurrentPage(page);
                                // Scroll to top if needed
                            }} 
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 flex flex-col items-center">
                    <p>Chưa có lịch sử tạo ảnh</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Zoom Modal */}
        {zoomedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setZoomedImage(null)}>
            <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <img src={zoomedImage} alt="Zoomed Result" className="max-w-full max-h-full object-contain rounded-lg" />
              
              {/* Close Button */}
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 right-4 text-white hover:text-orange-500 bg-black/50 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Download Button */}
              <button
                onClick={() => handleDownload(zoomedImage, `generated-image-${Date.now()}.png`)}
                className="absolute bottom-4 left-4 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải xuống
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const totalHistoryPages = Math.ceil(history.length / HISTORY_PER_PAGE);
  const paginatedHistory = history.slice((historyCurrentPage - 1) * HISTORY_PER_PAGE, historyCurrentPage * HISTORY_PER_PAGE);

  const renderCategoryContent = () => {
    if (selectedItem) {
      return renderPromptDetail();
    }

    let currentItems: PromptItem[] = [];
    let currentTitle = "";
    let currentDesc = "";
    let tag = "";

    if (selectedCategory === 'Nhà Phố') {
      currentItems = nhaPhoItems;
      currentTitle = t("promptLibraryPage.categories.townHouse.title", "Nhà Phố");
      currentDesc = t("promptLibraryPage.categories.townHouse.description", "Khám phá các mẫu thiết kế nhà phố hiện đại, tối ưu diện tích.");
      tag = "NHÀ";
    } else if (selectedCategory === 'Biệt Thự') {
      currentItems = bietThuItems;
      currentTitle = t("promptLibraryPage.categories.villa.title", "Biệt Thự");
      currentDesc = t("promptLibraryPage.categories.villa.description", "Các công trình biệt thự đẳng cấp, sân vườn và phong cách tân cổ điển.");
      tag = "BIỆT THỰ";
    } else if (selectedCategory === 'Nội Thất') {
      currentItems = noiThatItems;
      currentTitle = t("promptLibraryPage.categories.interior.title", "Nội Thất");
      currentDesc = t("promptLibraryPage.categories.interior.description", "Ý tưởng không gian sống tinh tế từ phòng khách đến phòng ngủ.");
      tag = "NỘI THẤT";
    }

    if (selectedCategory && currentItems.length > 0) {
      return (
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
              <button onClick={() => setSelectedCategory(null)} className="hover:text-white transition-colors">{t('promptLibraryPage.backToLibrary', 'Thư viện')}</button>
              <span>/</span>
              <span className="text-white font-bold uppercase">{currentTitle}</span>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h2 className="text-3xl font-bold text-white mb-2">{currentTitle}</h2>
              <p className="text-gray-400">{currentDesc}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
            {currentItems.map((item, index) => (
              <div key={index} onClick={() => { setSelectedItem(item); setHoveredThumbnail(null); }} className="group bg-[#2a303c] rounded-xl overflow-hidden shadow-lg border border-slate-700 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col">
                <div 
                  className="h-48 w-full relative overflow-hidden"
                  onMouseEnter={() => setHoveredThumbnail(item.imageUrl)}
                  onMouseLeave={() => setHoveredThumbnail(null)}
                >
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute top-3 left-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider z-10">
                    {tag}
                  </div>
                </div>
                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto w-full">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-architecture tracking-widest">
            THƯ VIỆN PROMPT KIẾN TRÚC
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Cảm hứng sáng tạo không giới hạn với kho mẫu Prompt dành riêng cho kiến trúc sư và nhà thiết kế AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
          {libraryCards.map((card, index) => (
            <div 
              key={index} 
              onClick={() => { setSelectedCategory(card.title); setHoveredThumbnail(null); }}
              className="group relative bg-[#2a303c] rounded-2xl overflow-hidden shadow-lg border border-slate-700 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
              onMouseEnter={() => setHoveredThumbnail(card.imageUrl)}
              onMouseLeave={() => setHoveredThumbnail(null)}
            >
              <div className="h-64 w-full relative flex items-center justify-center overflow-hidden">
                <img 
                  src={card.imageUrl} 
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 z-0 opacity-80" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-black/40 to-transparent z-0"></div>
                
                <div className="absolute bottom-0 left-0 w-full p-6 z-10 transform transition-transform duration-300">
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#282f3d] min-h-screen flex flex-col font-sans text-gray-300">
      <header className="bg-[#286453] text-center py-6 text-white shadow-md flex-shrink-0 relative">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-wider animate-glow">3DMILI.ORG - APPS AUTO RENDERING ™</h1>
          <p className="text-xs tracking-wide text-gray-300 mt-2 px-4">{t('imageGenerationPage.subtitle')}</p>
          
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
              <button
                onClick={toggleMode}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                  mode === 'pro' || mode === 'banana2'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-lg shadow-purple-500/30'
                    : 'bg-slate-800 text-yellow-400 border-yellow-500/30 hover:bg-slate-700'
                }`}
                title={mode === 'pro' ? "Đang dùng Nano Banana Pro (4K, Gemini 3.1)" : mode === 'banana2' ? "Đang dùng Banana 2 (Gemini 3.1 Flash Image)" : "Đang dùng Nano Banana (Basic, Gemini 2.5)"}
              >
                {mode === 'pro' || mode === 'banana2' ? <SparklesIcon className="w-4 h-4 animate-pulse" /> : <BoltIcon className="w-4 h-4" />}
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                  {mode === 'pro' ? 'Pro Ver 3.0' : mode === 'banana2' ? 'Banana 2' : 'Basic Ver 2.5'}
                </span>
              </button>

              <button
                onClick={toggleSnow}
                title={isSnowing ? "Tắt tuyết rơi" : "Bật tuyết rơi"}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center border ${
                  isSnowing 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span className="text-lg leading-none">❄️</span>
              </button>
          </div>
      </header>

      <div className="flex-grow flex flex-col min-h-0">
          <nav className="bg-[#202633] px-4 sm:px-6 py-2 border-b border-t border-black/20 flex-shrink-0">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="w-full lg:flex-1 flex justify-start">
                      <button onClick={() => onNavigate('home')} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                          <ChevronLeftIcon className="w-5 h-5" />
                          <span className="font-semibold">Home</span>
                      </button>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 lg:flex-none">
                      <div className="flex flex-wrap justify-center items-center gap-2">
                          {mainActionButtons.map(btn => (
                              <button key={btn.id} onClick={() => handleActionChange(btn.id)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300`}>
                                  {t(btn.key)}
                              </button>
                          ))}
                      </div>
                      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                          {subActionButtons.map(btn => (
                               <button key={btn.id} onClick={() => handleActionChange(btn.id)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300`}>
                                  {t(btn.key)}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="w-full lg:flex-1 flex justify-center lg:justify-end items-center gap-4 mt-4 lg:mt-0">
                      <OnlineStatus />
                      <LanguageSwitcher />
                  </div>
              </div>
          </nav>

          <div className="flex-grow bg-[#1e293b] p-8 overflow-y-auto custom-scrollbar">
            {renderCategoryContent()}
          </div>
      </div>
      <Footer />

      {/* Hover Preview Popup */}
      {hoveredThumbnail && !selectedItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-sm animate-fade-in">
          <img 
            src={hoveredThumbnail} 
            alt="Thumbnail Preview" 
            className="max-w-[80vw] max-h-[80vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
          />
        </div>
      )}
    </div>
  );
};

export default PromptLibraryPage;
