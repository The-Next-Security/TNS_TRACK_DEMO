// MapModal.js

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import MapboxGL from 'mapbox-gl';

const MapModal = ({ latitud, longitud, onClose }) => {
  const mapContainerRef = useRef(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    axios.get("/api/config/mapbox").then((res) => {
      const token = res.data?.accessToken || res.data?.access_token;
      if (token) {
        MapboxGL.accessToken = token;
        setAccessToken(token);
      }
    }).catch((err) => {
      console.error("Error obteniendo token Mapbox:", err);
    });
  }, []);

  useEffect(() => {
    if (!accessToken || !mapContainerRef.current) return;

    const map = new MapboxGL.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [longitud, latitud],
      zoom: 14,
    });

    new MapboxGL.Marker()
      .setLngLat([longitud, latitud])
      .addTo(map);

    return () => map.remove();
  }, [latitud, longitud, accessToken]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-3/4 max-w-2xl h-[500px] relative flex flex-col">
        <span
          className="absolute top-2 right-3 cursor-pointer text-2xl font-bold text-gray-600 hover:text-black z-10"
          onClick={onClose}
        >
          &times;
        </span>
        {!accessToken ? (
          <div className="flex items-center justify-center flex-1 text-gray-500">
            Cargando mapa...
          </div>
        ) : (
          <div className="flex-1 rounded-b-lg" ref={mapContainerRef} />
        )}
      </div>
    </div>
  );
};

export default MapModal;
