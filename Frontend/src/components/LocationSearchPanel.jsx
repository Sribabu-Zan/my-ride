import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import "remixicon/fonts/remixicon.css";
import axios from 'axios';
import LoadingAnimation from './LoadingAnimation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap'

const LocationSearchPanel = ({
  setVehiclePanel,
  setPanelOpen,
  activeField,
  suggestions,
  setPickupLocation,
  setDestinationLocation,
  pickupLocation,
  destinationLocation,
  setFare,
  suggestionLoading,
  setShowAlert,
  from_here_pickup,
  from_here_destination,
  setFrom_here_pickup,
  setFrom_here_destination
}) => {
  const loadingRef=useRef(null)
  const [locating, setLocating] = useState(false)

  useGSAP(function () {
    if(suggestionLoading){
      gsap.to(loadingRef.current, {
        opacity: 1,
        duration: 5
      })
    }
    else{
      gsap.to(loadingRef.current, {
        opacity: 0,
        duration: 5
      })
    }
  }, [suggestionLoading])
  async function fetch(){
      console.log("PickupLocation  " +pickupLocation)
      console.log("DestinationLocation  " +destinationLocation)
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/rides/get-fare`,
          {
            params: { pickup: pickupLocation, destination: destinationLocation },
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        setVehiclePanel(true);
        setPanelOpen(false);
        setFare(response.data);
      } catch (error) {
        console.log(error.message);
        setShowAlert(true)
        setTimeout(() => {
          setShowAlert(false)
          setPickupLocation('')
          setDestinationLocation('')
          setFrom_here_pickup(false)
          setFrom_here_destination(false)
        }, 2000)
        setPanelOpen(false)
        console.error("Error fetching fare:", error.message);
      }
  }
  const handleSuggestionClick = async (suggestion) => {
    if (activeField === 'pickup') {
      setPickupLocation(suggestion);
      setFrom_here_pickup(true)
    } else if (activeField === 'destination') {
      setDestinationLocation(suggestion);
      setFrom_here_destination(true)
    }
  };
  // Use the device's GPS to fill the active field with a readable address.
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported on this device");
      return;
    }
    // The Geolocation API only works on https:// or localhost. On a plain-http
    // LAN IP (e.g. testing on a phone) the browser blocks it silently.
    if (!window.isSecureContext) {
      toast.error("Location needs a secure (https) connection");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await axios.get(
            `${import.meta.env.VITE_BASE_URL}/maps/reverse-geocode`,
            {
              params: { lat: latitude, lng: longitude },
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );
          handleSuggestionClick(response.data.address);
        } catch (error) {
          toast.error("Couldn't look up your address. Please try again.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        const messages = {
          1: "Location permission denied. Enable it in your browser settings.",
          2: "Location unavailable. Check that GPS/location is turned on.",
          3: "Location request timed out. Please try again.",
        };
        toast.error(messages[error.code] || "Couldn't get your location");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  useEffect(() => {
    if(from_here_pickup && from_here_destination && pickupLocation !== '' && destinationLocation !== ''){
        fetch()
    }
    },[from_here_pickup,from_here_destination,pickupLocation,destinationLocation])
  if (suggestionLoading) {
    return (
      <div ref={loadingRef}  className='flex opacity-0 justify-center items-center flex-col absolute bottom-[43%] left-[50%]'> 
        <LoadingAnimation />
      </div>

    )
  }
  else {
    return (
      <div className=''>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="flex w-full gap-4 border-2 p-3 border-gray-50 active:border-black rounded-xl items-center my-2 justify-start disabled:opacity-60"
        >
          <span className="bg-[#eee] h-8 flex items-center justify-center w-12 rounded-full">
            <i className="ri-crosshair-2-line"></i>
          </span>
          <span className="font-medium">
            {locating ? 'Locating…' : 'Use current location'}
          </span>
        </button>
        {suggestions.map((elem, idx) => (
          <div
            key={idx}
            onClick={() => handleSuggestionClick(elem.description)}
            className="flex gap-4 border-2 p-3 border-gray-50 active:border-black rounded-xl items-center my-2 justify-start"
          >
            <h2 className="bg-[#eee] h-8 flex items-center justify-center w-12 rounded-full">
              <i className="ri-map-pin-fill"></i>
            </h2>
            <h4 className="font-base">{elem.description}</h4>
          </div>
        ))}
      </div>



    );
  }


};

export default LocationSearchPanel;
