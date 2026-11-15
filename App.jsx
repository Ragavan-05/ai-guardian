import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./App.css";

function App() {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState("Your safety matters.");
  const [isTesting, setIsTesting] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const [contacts, setContacts] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("aiGuardianContacts")
      ) || [];
    } catch {
      return [];
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("aiGuardianHistory")
      ) || [];
    } catch {
      return [];
    }
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  // SAVE CONTACTS
  useEffect(() => {
    localStorage.setItem(
      "aiGuardianContacts",
      JSON.stringify(contacts)
    );
  }, [contacts]);

  // SAVE HISTORY
  useEffect(() => {
    localStorage.setItem(
      "aiGuardianHistory",
      JSON.stringify(history)
    );
  }, [history]);

  // GET FRESH GPS LOCATION
  function getFreshLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS is not supported."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            time: new Date().toLocaleString(),
          };

          setLocation(currentLocation);
          resolve(currentLocation);
        },
        () => {
          reject(
            new Error(
              "Location unavailable. Please allow GPS permission."
            )
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }

  // DETECT LOCATION
  async function detectLocation() {
    try {
      setStatus("Detecting your current location...");

      await getFreshLocation();

      setStatus("Location detected successfully.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  // ADD TRUSTED CONTACT
  function addContact(event) {
    event.preventDefault();

    if (
      !name.trim() ||
      !/^\+?[0-9\s()-]{7,20}$/.test(phone.trim())
    ) {
      setStatus("Enter a valid contact name and phone number.");
      return;
    }

    if (!consentGiven) {
      setStatus(
        "Please confirm that this contact agreed to receive alerts."
      );
      return;
    }

    setContacts((previous) => [
      ...previous,
      {
        id: Date.now(),
        name: name.trim(),
        phone: phone.trim(),
        consent: true,
      },
    ]);

    setName("");
    setPhone("");
    setConsentGiven(false);

    setStatus("Trusted contact added successfully.");
  }

  // REMOVE CONTACT
  function removeContact(id) {
    setContacts((previous) =>
      previous.filter((contact) => contact.id !== id)
    );

    setStatus("Contact removed.");
  }

  // UPDATE CONTACT CONSENT
  function updateContactConsent(id, consent) {
    setContacts((previous) =>
      previous.map((contact) =>
        contact.id === id
          ? { ...contact, consent }
          : contact
      )
    );
  }

  // RECORD HISTORY
  function addHistory(message) {
    setHistory((previous) => [
      {
        id: Date.now(),
        message,
        time: new Date().toLocaleString(),
      },
      ...previous,
    ]);
  }

  // WHATSAPP LOCATION SHARING
  async function openWhatsApp(contact) {
    if (contact.consent !== true) {
      setStatus(
        "This contact has not agreed to receive alerts."
      );
      return;
    }

    try {
      setStatus("Getting your current location...");

      const currentLocation = await getFreshLocation();

      const mapLink =
        `https://www.google.com/maps?q=` +
        `${currentLocation.latitude},${currentLocation.longitude}`;

      const message =
        "AI GUARDIAN SOS ALERT!\n\n" +
        "I need help. Please contact me.\n\n" +
        "My current location:\n" +
        mapLink;

      const phoneNumber = contact.phone.replace(/\D/g, "");

      const whatsappURL =
        `https://wa.me/${phoneNumber}?text=` +
        encodeURIComponent(message);

      window.open(whatsappURL, "_blank");

      setStatus(
        `WhatsApp opened for ${contact.name}. Review and press Send.`
      );

      addHistory(
        `WhatsApp location message prepared for ${contact.name}.`
      );
    } catch (error) {
      setStatus(error.message);
    }
  }

  // SOS BUTTON
  async function startSOS() {
    if (isTesting) return;

    const eligibleContacts = contacts.filter(
      (contact) => contact.consent === true
    );

    if (eligibleContacts.length === 0) {
      setStatus("Please add a consenting trusted contact.");

      document
        .getElementById("trusted-contacts")
        ?.scrollIntoView({ behavior: "smooth" });

      return;
    }

    setIsTesting(true);
    setCountdown(null);

    try {
      setStatus("Getting your current GPS location...");

      const currentLocation = await getFreshLocation();

      const mapLink =
        `https://www.google.com/maps?q=` +
        `${currentLocation.latitude},${currentLocation.longitude}`;

      const firstContact = eligibleContacts[0];

      const phoneNumber = firstContact.phone.replace(/\D/g, "");

      const message =
        "AI GUARDIAN SOS ALERT!\n\n" +
        "I need help. Please contact me.\n\n" +
        "My current location:\n" +
        mapLink;

      const whatsappURL =
        `https://wa.me/${phoneNumber}?text=` +
        encodeURIComponent(message);

      addHistory(
        `WhatsApp SOS message prepared for ${firstContact.name}.`
      );

      setStatus(
        "Opening WhatsApp. Review the message and press Send."
      );

      window.open(whatsappURL, "_blank");

    } catch (error) {
      setStatus("SOS failed: " + error.message);
    } finally {
      setIsTesting(false);
    }
  }

  // 10-SECOND COUNTDOWN
  function startCountdown() {
    if (countdown !== null || isTesting) return;

    const eligibleContacts = contacts.filter(
      (contact) => contact.consent === true
    );

    if (eligibleContacts.length === 0) {
      setStatus("Please add a trusted contact first.");

      document
        .getElementById("trusted-contacts")
        ?.scrollIntoView({ behavior: "smooth" });

      return;
    }

    let remaining = 10;

    setCountdown(remaining);

    setStatus(
      "SOS countdown started. Cancel if this was accidental."
    );

    const timer = setInterval(() => {
      remaining -= 1;

      setCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        window.aiGuardianTimer = null;
        startSOS();
      }
    }, 1000);

    window.aiGuardianTimer = timer;
  }

  // CANCEL SOS
  function cancelSOS() {
    clearInterval(window.aiGuardianTimer);

    window.aiGuardianTimer = null;

    setCountdown(null);

    setStatus("SOS cancelled. No message was sent.");
  }

  // MAP LINK
  const mapLink = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : "#";

  return (
    <div className="app">

      {/* HEADER */}

      <header className="navbar">
        <a href="#home" className="logo">
          🛡️ AI GUARDIAN
        </a>

        <span className="system-status">
          <span className="green-dot"></span>
          SAFETY SYSTEM
        </span>
      </header>

      {/* SECTION 1: SOS HOME */}

      <section
        className="scroll-section hero-section"
        id="home"
      >
        <p className="eyebrow">
          YOUR PERSONAL SAFETY COMPANION
        </p>

        <h1>
          Your Safety.
          <br />
          <span>Your Priority.</span>
        </h1>

        <p className="description">
          Stay connected with the people who matter.
          Your safety is our priority.
        </p>

        <div className="sos-circle">
          <button
            className="sos-button"
            onClick={startCountdown}
            disabled={isTesting || countdown !== null}
          >
            <strong>
              {isTesting
                ? "..."
                : countdown !== null
                ? countdown
                : "SOS"}
            </strong>

            <span>EMERGENCY</span>

            <small>
              {isTesting
                ? "PLEASE WAIT"
                : countdown !== null
                ? "COUNTDOWN"
                : "PRESS FOR SOS"}
            </small>
          </button>
        </div>

        {countdown !== null && (
          <button
            className="cancel-button"
            onClick={cancelSOS}
          >
            CANCEL SOS
          </button>
        )}

        <div className="status-box">
          {status}
        </div>

        <p className="notice">
          WhatsApp opens with your location message.
          You must review and press Send yourself.
        </p>

        <a href="#my-location" className="scroll-down">
          SCROLL TO EXPLORE ↓
        </a>
      </section>

      {/* SECTION 2: MY LOCATION */}

      <section
        className="scroll-section feature-section"
        id="my-location"
      >
        <div className="section-heading">
          <span>📍</span>
          <p>SECTION 02</p>
          <h1>My Location</h1>
          <h3>Know where you are.</h3>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🌍</div>

          <h2>GPS Location Detection</h2>

          <p>
            Detect your current location using your
            device's GPS permission.
          </p>

          <button
            className="primary-button"
            onClick={detectLocation}
          >
            Detect My Location
          </button>

          {location && (
            <div className="location-details">
              <h3>Location Details</h3>

              <p>
                <strong>Latitude:</strong>{" "}
                {location.latitude}
              </p>

              <p>
                <strong>Longitude:</strong>{" "}
                {location.longitude}
              </p>

              <p>
                <strong>Time:</strong>{" "}
                {location.time}
              </p>

              <a
                href={mapLink}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps ↗
              </a>
            </div>
          )}
        </div>

        <a href="#live-map" className="scroll-down">
          NEXT SECTION ↓
        </a>
      </section>

      {/* SECTION 3: LIVE GPS MAP */}

      <section
        className="scroll-section feature-section"
        id="live-map"
      >
        <div className="section-heading">
          <span>🗺️</span>
          <p>SECTION 03</p>
          <h1>Live GPS Map</h1>
          <h3>Visualize your current location.</h3>
        </div>

        <div className="feature-card map-card">
          {location ? (
            <>
              <MapContainer
                center={[
                  location.latitude,
                  location.longitude,
                ]}
                zoom={16}
                style={{
                  height: "420px",
                  width: "100%",
                  borderRadius: "15px",
                }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker
                  position={[
                    location.latitude,
                    location.longitude,
                  ]}
                >
                  <Popup>Your detected location</Popup>
                </Marker>
              </MapContainer>

              <a
                className="map-link-button"
                href={mapLink}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps ↗
              </a>
            </>
          ) : (
            <div className="map-placeholder">
              <span>📍</span>
              <h2>Location not detected</h2>

              <p>
                Detect your location to display the map.
              </p>

              <button
                className="primary-button"
                onClick={detectLocation}
              >
                Detect My Location
              </button>
            </div>
          )}
        </div>

        <a href="#trusted-contacts" className="scroll-down">
          NEXT SECTION ↓
        </a>
      </section>

      {/* SECTION 4: TRUSTED CONTACTS */}

      <section
        className="scroll-section feature-section"
        id="trusted-contacts"
      >
        <div className="section-heading">
          <span>👥</span>
          <p>SECTION 04</p>
          <h1>Trusted Contacts</h1>
          <h3>Your important people, always in reach.</h3>
        </div>

        <div className="feature-card">
          <h2>+ Add New Contact</h2>

          <form
            className="contact-form"
            onSubmit={addContact}
          >
            <label>Contact Name</label>

            <input
              type="text"
              placeholder="Enter contact name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label>WhatsApp Phone Number</label>

            <input
              type="tel"
              placeholder="+91XXXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <label className="consent-label">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) =>
                  setConsentGiven(e.target.checked)
                }
              />

              This contact has agreed to receive
              emergency WhatsApp messages.
            </label>

            <button
              className="primary-button"
              type="submit"
            >
              Add Trusted Contact
            </button>
          </form>

          <h2 className="contact-list-heading">
            Your Contacts ({contacts.length})
          </h2>

          {contacts.length === 0 ? (
            <p className="empty-message">
              No trusted contacts added yet.
            </p>
          ) : (
            contacts.map((contact) => (
              <div
                className="contact-row"
                key={contact.id}
              >
                <div>
                  <strong>👤 {contact.name}</strong>
                  <p>{contact.phone}</p>

                  {/* WHATSAPP BUTTON */}

                  <button
                    type="button"
                    onClick={() => openWhatsApp(contact)}
                    disabled={contact.consent !== true}
                    style={{
                      background: "#25D366",
                      color: "#ffffff",
                      border: "none",
                      padding: "11px 18px",
                      borderRadius: "8px",
                      cursor:
                        contact.consent === true
                          ? "pointer"
                          : "not-allowed",
                      marginTop: "10px",
                      fontWeight: "bold",
                      opacity:
                        contact.consent === true ? 1 : 0.5,
                    }}
                  >
                    💬 WhatsApp Location
                  </button>
                </div>

                <label>
                  <input
                    type="checkbox"
                    checked={contact.consent === true}
                    onChange={(e) =>
                      updateContactConsent(
                        contact.id,
                        e.target.checked
                      )
                    }
                  />

                  Agreed to receive alerts
                </label>

                <button
                  className="remove-button"
                  onClick={() => removeContact(contact.id)}
                  title="Remove contact"
                  aria-label={`Remove ${contact.name}`}
                >
                  <span className="delete-icon">✕</span>
                  <span>Remove</span>
                </button>
              </div>
            ))
          )}
        </div>

        <a
          href="#emergency-history"
          className="scroll-down"
        >
          NEXT SECTION ↓
        </a>
      </section>

      {/* SECTION 5: EMERGENCY HISTORY */}

      <section
        className="scroll-section feature-section"
        id="emergency-history"
      >
        <div className="section-heading">
          <span>📋</span>
          <p>SECTION 05</p>
          <h1>Emergency History</h1>
          <h3>Your recent safety activities.</h3>
        </div>

        <div className="feature-card">
          <h2>Recent Activity</h2>

          <p className="history-count">
            Total records: {history.length}
          </p>

          {history.length === 0 ? (
            <div className="map-placeholder">
              <span>📂</span>
              <h2>No History Available</h2>

              <p>
                Your WhatsApp location-sharing activities
                will appear here.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                className="history-row"
                key={item.id}
              >
                <span className="history-icon">🛡️</span>

                <div>
                  <strong>{item.message}</strong>
                  <p>{item.time}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <a href="#home" className="scroll-down">
          ↑ BACK TO HOME
        </a>
      </section>

      {/* FOOTER */}

      <footer>
        <strong>🛡️ AI GUARDIAN</strong>
        <p>Stay Aware. Stay Connected. Stay Safe.</p>
        <small>Personal Safety Assistant</small>
      </footer>

    </div>
  );
}

export default App;