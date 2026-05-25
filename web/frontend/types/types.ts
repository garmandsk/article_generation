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