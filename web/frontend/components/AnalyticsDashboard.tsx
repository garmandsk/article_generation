import { useEffect, useState } from "react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { PieChartData, BarChartData } from "@/types/types";

// Palet warna elegan ala modern dashboard
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"]; 

export default function AnalyticsDashboard() {
  const [chartData, setChartData] = useState<{ pie_status_data: PieChartData[]; bar_topic_data: BarChartData[] } | null>(null);

  useEffect(() => {
    // Tarik data dari endpoint analitik backend
    fetch("http://localhost:8000/api/v1/data/analytics")
      .then((res) => res.json())
      .then((resJson) => {
        if (resJson.status === "success") {
          setChartData(resJson.data);
        }
      })
      .catch((err) => console.error("Gagal memuat analitik grafik:", err));
  }, []);

  if (!chartData) return <div className="text-center p-10 text-slate-400">Memuat grafik analitik...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-slate-950 min-h-screen text-slate-100">
      
      {/* 📊 KARTU 1: PIE CHART (Status Artikel Pipeline) */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Status Artikel</h3>
          <p className="text-xs text-slate-400 mb-4">Proporsi data di dalam pipeline state machine</p>
        </div>
        <div className="h-[300px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.pie_status_data}
                cx="50%"
                cy="45%"
                innerRadius={60} // Membuat efek Donut Chart yang modern
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.pie_status_data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📊 KARTU 2: HORIZONTAL BAR CHART (Top 10 Sebaran Topik AI) */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl lg:col-span-2 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Top 10 Sebaran Topik</h3>
          <p className="text-xs text-slate-400 mb-4">Klaster topik AI terbanyak yang berhasil diekstraksi oleh BERTopic</p>
        </div>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {/* 🔥 KUNCI HORIZONTAL: Set layout="vertical" pada BarChart */}
            <BarChart
              data={chartData.bar_topic_data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              
              {/* Sumbu X bertipe angka, Sumbu Y bertipe kategori nama topik */}
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis 
                type="category" 
                dataKey="topic" 
                stroke="#94a3b8" 
                fontSize={10}
                width={100}
                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value} // Potong teks jika terlalu panjang di sumbu Y
              />
              
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                cursor={{ fill: "rgba(51, 65, 85, 0.3)" }}
              />
              
              {/* Batang Grafik dengan sudut melengkung border-radius (radius=[0, 4, 4, 0]) */}
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                {chartData.bar_topic_data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? "#60a5fa" : "#3b82f6"} /> // Beri warna lebih terang khusus peringkat #1
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}