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
  article_count: number;
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

export interface ArticleData {
  id: string;
  title: string;
  content: string;
  type: string;
  date: string;
}

export interface ScrapResult {
  status_code?: number,
  status?: string,
  message: string,
  error?: boolean,
  data?: {
    details_scrap: {
      newer_article: number,
      older_article: number,
    }
    system_health: {
        total_list: number,
        total_content: number,
        total_chromadb: number
    },
    mode: string,
  },
  exec_time?: string
}

export interface ClusterList {
  cluster_id: number,
  cluster_name: string,
  cluster_keywords: string[],
  article_count: number,
  is_recommended: boolean
}

export interface ClusterResult {
  status_code?: number,
  status?: string,
  message?: string,
  error: boolean,
  data?: {
    metadatas: {
        total_cluster: number,
        total_recommended: number,
        clustered_total_article: number,
        outlier_total_article: number,
        min_cf_range: number
    },
    cluster: ClusterList[]
  },
  exec_time?: string
}

export interface GenerateResult {
  status_code?: number,
  status?: string,
  message: string,
  error: boolean,
  data?: {
    title: string,
    content: string
  },
  exec_time?: string,
}

export type TopicSortOption = "count_desc" | "count_asc" | "name_asc" | "name_desc" | "rec";