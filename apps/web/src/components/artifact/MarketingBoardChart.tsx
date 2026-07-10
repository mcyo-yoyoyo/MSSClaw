import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function MarketingBoardChart() {
  return (
    <Bar
      data={{
        labels: ['7月', '8月', '9月', '预测10月'],
        datasets: [
          {
            label: '实际销量',
            data: [52000, 48000, 42500, 0],
            backgroundColor: '#6366f1',
            borderRadius: 4,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true } },
      }}
    />
  );
}
