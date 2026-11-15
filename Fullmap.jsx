import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./Fullmap.css";

// Update map when GPS location changes
function MapUpdater({ location }) {
  const map = useMap();

  useEffect(() => {
    map.setView(
      [location.latitude, location.longitude],
      19
    );
  }, [location, map]);

  return null;
}

// Main Full Map Component
function FullMap({ location, onBack }) {
  const [address, setAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [addressError, setAddressError] = useState("");

  // Get street name and address using OpenStreetMap
  useEffect(() => {
    if (!location) return;

    let cancelled = false;

    async function getAddress() {
      setLoadingAddress(true);
      setAddress(null);
      setAddressError("");

      try {
        const url =
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
          `&lat=${location.latitude}` +
          `&lon=${location.longitude}` +
          `&zoom=18&addressdetails=1`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Address lookup failed (${response.status})`
          );
        }

        const data = await response.json();

        console.log("NOMINATIM ADDRESS:", data);

        if (!cancelled) {
          setAddress(data);
        }
      } catch (error) {
        console.error("Address error:", error);

        if (!cancelled) {
          setAddressError(
            "Unable to retrieve address. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAddress(false);
        }
      }
    }

    getAddress();

    return () => {
      cancelled = true;
    };
  }, [location.latitude, location.longitude]);

  if (!location) return null;

  // Extract address information
  const addressData = address?.address || {};

  const street =
    addressData.road ||
    addressData.residential ||
    addressData.pedestrian ||
    addressData.footway ||
    addressData.path ||
    "Street name unavailable";

  const area =
    addressData.suburb ||
    addressData.neighbourhood ||
    addressData.quarter ||
    addressData.village ||
    "Area unavailable";

  const city =
    addressData.city ||
    addressData.town ||
    addressData.municipality ||
    addressData.county ||
    "City unavailable";

  const postcode =
    addressData.postcode || "Unavailable";

  const fullAddress =
    address?.display_name || "Full address unavailable";

  const mapLink =
    `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

  return (
    <div className="full-map-page">

      {/* HEADER */}
      <header className="full-map-header">

        <button onClick={onBack}>
          ← Back to Dashboard
        </button>

        <h2>AI GUARDIAN GPS MAP</h2>

        <span>📍 Location Active</span>

      </header>

      {/* LOCATION DETAILS */}
      <div className="full-map-details">

        <h3>📍 CURRENT LOCATION DETAILS</h3>

        {loadingAddress ? (

          <p>Finding your street and road name...</p>

        ) : addressError ? (

          <p>{addressError}</p>

        ) : (

          <>
            <p>
              🛣️ <strong>Street / Road:</strong> {street}
            </p>

            <p>
              🏘️ <strong>Area:</strong> {area}
            </p>

            <p>
              🌆 <strong>City:</strong> {city}
            </p>

            <p>
              📮 <strong>PIN Code:</strong> {postcode}
            </p>

            <p>
              🏠 <strong>Full Address:</strong> {fullAddress}
            </p>
          </>

        )}

        <hr />

        <p>
          <strong>Latitude:</strong> {location.latitude}
        </p>

        <p>
          <strong>Longitude:</strong> {location.longitude}
        </p>

        <p>
          <strong>Updated:</strong> {location.time}
        </p>

        <a
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="location-map-link"
        >
          Open Location in Google Maps ↗
        </a>

      </div>

      {/* FULL SCREEN MAP */}
      <div className="full-map-container">

        <MapContainer
          center={[
            location.latitude,
            location.longitude,
          ]}
          zoom={19}
          minZoom={3}
          maxZoom={22}
          style={{
            height: "100%",
            width: "100%",
          }}
        >

          <TileLayer
  attribution='&copy; OpenStreetMap contributors'
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  maxZoom={19}
/>

          <Marker
            position={[
              location.latitude,
              location.longitude,
            ]}
          >

            <Popup>

              <strong>Your Current Location</strong>

              <br />

              {street}

              <br />

              {area}

            </Popup>

          </Marker>

          <MapUpdater location={location} />

        </MapContainer>

      </div>

    </div>
  );
}

export default FullMap;