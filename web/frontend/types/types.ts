export interface DashboardStats {
  scrap: { 
    total_data_list: number; 
    total_data_content: number; 
    total_data_db: number; 
  };
  cluster: { 
    total_data_article_clustered: number;
    total_data_article_outlier: number;
    total_data_topic: number; 
    total_data_keyword: number; 
    total_data_rec_topic: number; 
    total_data_rec_keyword: number; 
  };
  generate: { 
    total_data_generate: number; 
  };
}

export interface PieChartData {
  name: string;
  value: number;
}

export interface BarChartData {
  topic: string;
  count: number;
}

export interface DashboardAnalytics {
  pie_data: PieChartData[];
  bar_data: BarChartData[];
}

// Komponen Input Tag Kustom
export interface TagInputProps {
  label: string;
  tags: { id: string; name: string; color: string }[];
  placeholder?: string;
  isLoading?: boolean;
  onAddTag: (tagName: string) => void;
  onRemoveTag: (tagId: string) => void;
}

// Tipe Data untuk Topik yang ditarik dari Backend
export interface TopicData {
  id: string;
  name: string;
  color: string;
  keywords: string[];
};

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  isDestructive?: boolean;
  children?: React.ReactNode;
}