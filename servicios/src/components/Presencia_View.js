import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import HeaderV2 from "./Header_View";
import { DateTime } from "luxon";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);
/* MÓDULO FUTURO - Teltonika/Beacons: pendiente de desarrollo */

const Presencia = () => {
  const [data, setData] = useState([]);
  const [beacons, setBeacons] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pieChartData, setPieChartData] = useState({});
  const [summaryPieChartData, setSummaryPieChartData] = useState(null);
  const today = useRef(new Date());

  useEffect(() => {
    console.log("Fetching beacon data...");
    axios
      .get("/api/beacons/beacons")
      .then((response) => {
        console.log("Beacons data:", response.data);
        setBeacons(response.data);
      })
      .catch((error) => {
        console.error("Error fetching beacons:", error);
      });

    fetchDataForSelectedDate(selectedDate);
  }, [selectedDate]);

  const fetchDataForSelectedDate = (date) => {
    const startDate = DateTime.fromJSDate(date)
      .set({ hour: 8, minute: 0, second: 0 })
      .toFormat("yyyy-MM-dd HH:mm:ss");
    const endDate = DateTime.fromJSDate(date)
      .set({ hour: 23, minute: 30, second: 0 })
      .toFormat("yyyy-MM-dd HH:mm:ss");

    console.log(`Fetching data for date range: ${startDate} - ${endDate}`);

    axios
      .get("/api/beacons/beacons-detection-status", {
        params: {
          startDate: startDate,
          endDate: endDate,
        },
      })
      .then((response) => {
        console.log("Beacon detection status data:", response.data);
        setData(response.data);
        generatePieChartData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching beacons detection status:", error);
      });
  };

  const generatePieChartData = (data) => {
    const sectors = [
      "Sector_1",
      "Sector_2",
      "Sector_3",
      "Sector_4",
      "Sector_5",
    ];
    const colors = {
      Verde: "#4CAF50",
      Rojo: "#F44336",
      Amarillo: "#FFEB3B",
      Negro: "#212121",
    };
    const statusLabels = {
      Verde: "Presencia OK",
      Rojo: "Presencia menor al esperado",
      Amarillo: "Presencia baja",
      Negro: "No hubo presencia",
    };

    const pieData = {};
    const summaryData = {
      Verde: 0,
      Rojo: 0,
      Amarillo: 0,
      Negro: 0,
    };

    sectors.forEach((sector) => {
      const sectorData = data.map((entry) => entry[sector]);
      const counts = {
        Verde: 0,
        Rojo: 0,
        Amarillo: 0,
        Negro: 0,
      };

      sectorData.forEach((status) => {
        if (counts.hasOwnProperty(status)) {
          counts[status]++;
          summaryData[status]++;
        }
      });

      const total = Object.values(counts).reduce(
        (sum, count) => sum + count,
        0
      );
      const percentages = Object.entries(counts).map(([status, count]) => ({
        status,
        percentage: (count / total) * 100,
      }));

      pieData[sector] = {
        labels: percentages.map(
          (item) =>
            `${statusLabels[item.status]} (${item.percentage.toFixed(2)}%)`
        ),
        datasets: [
          {
            data: percentages.map((item) => item.percentage),
            backgroundColor: percentages.map((item) => colors[item.status]),
          },
        ],
      };
    });

    setPieChartData(pieData);

    const summaryTotal = Object.values(summaryData).reduce(
      (sum, count) => sum + count,
      0
    );
    const summaryPercentages = Object.entries(summaryData).map(
      ([status, count]) => ({
        status,
        percentage: (count / summaryTotal) * 100,
      })
    );

    setSummaryPieChartData({
      labels: summaryPercentages.map(
        (item) =>
          `${statusLabels[item.status]} (${item.percentage.toFixed(2)}%)`
      ),
      datasets: [
        {
          data: summaryPercentages.map((item) => item.percentage),
          backgroundColor: summaryPercentages.map(
            (item) => colors[item.status]
          ),
        },
      ],
    });
  };

  const handleDateChange = (date) => {
    console.log("Date selected:", date);
    if (date <= today.current) {
      setSelectedDate(date);
    } else {
      alert("No se puede seleccionar una fecha futura.");
    }
  };

  const getColorClass = (status) => {
    switch (status) {
      case "Verde":    return "w-full h-4 rounded bg-green-500";
      case "Rojo":     return "w-full h-4 rounded bg-red-500";
      case "Amarillo": return "w-full h-4 rounded bg-yellow-400";
      case "Negro":    return "w-full h-4 rounded bg-gray-900";
      default:         return "w-full h-4 rounded bg-transparent";
    }
  };

  const getChartTitle = (sector) => {
    const beacon = beacons.find((b) => b.lugar === sector.replace("_", " "));
    return beacon ? beacon.ubicacion : sector;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          font: {
            size: 10,
          },
        },
      },
      title: {
        display: true,
        font: {
          size: 16,
          weight: "bold",
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <HeaderV2 title="Status de Presencia" />
      <h1>Status de Presencia</h1>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        dateFormat="yyyy-MM-dd"
        className="border border-gray-300 rounded px-3 py-1 text-sm mb-4"
        maxDate={today.current}
      />
      {summaryPieChartData && (
        <div className="mb-6">
          <h2>Resumen General</h2>
          <div className="h-64 mx-auto max-w-sm">
            <Pie
              data={summaryPieChartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    ...chartOptions.plugins.title,
                    text: "Resumen de todos los sectores",
                  },
                },
              }}
            />
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-4 justify-center">
        {Object.entries(pieChartData).map(([sector, chartData]) => (
          <div key={sector} className="w-full sm:w-[45%] lg:w-[30%]">
            <h2>{getChartTitle(sector)}</h2>
            <div className="h-52">
              <Pie
                data={chartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      ...chartOptions.plugins.title,
                      text: getChartTitle(sector),
                    },
                  },
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 my-4 text-sm">
        <div>
          <span className="w-4 h-4 inline-block mr-1 rounded-sm bg-gray-900"></span> No hubo presencia
        </div>
        <div>
          <span className="w-4 h-4 inline-block mr-1 rounded-sm bg-red-500"></span> Presencia menor al esperado
        </div>
        <div>
          <span className="w-4 h-4 inline-block mr-1 rounded-sm bg-yellow-400"></span> Presencia baja
        </div>
        <div>
          <span className="w-4 h-4 inline-block mr-1 rounded-sm bg-green-500"></span> Presencia OK
        </div>
      </div>
      <div className="overflow-x-auto mt-4">
        <table>
          <thead>
            <tr>
              <th className="min-w-32 text-left p-2">Sector</th>
              {data.length > 0 &&
                data.map((entry, index) => (
                  <th key={index} className="w-8 p-1">
                    <span className="-rotate-90 block text-xs">
                      {new Date(entry.status_timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {beacons.map((beacon) => (
              <tr key={beacon.id}>
                <td>{beacon.ubicacion}</td>
                {data.map((entry, index) => (
                  <td key={index}>
                    <div className="relative">
                      <div
                        className={getColorClass(
                          entry[`Sector_${beacon.lugar.split(" ")[1]}`]
                        )}
                      ></div>
                      <div className="relative group">
                        <span className="tooltiptext">
                          {entry.status_timestamp}
                        </span>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Presencia;
