export interface DashboardStats {
  scrap: { 
    total_data_list: number; 
    total_data_content: number; 
    total_data_db: number; 
  };
  cluster: { 
    total_data_topic: number; 
    total_data_keyword: number; 
    total_data_rec_topic: number; 
    total_data_rec_keyword: number; 
  };
  generate: { 
    total_data_generate: number; 
  };
}