import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from "../assets/ai.gif"
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif"
function Home() {
  const {userData,serverUrl,setUserData,getGeminiResponse}=useContext(userDataContext)
  const navigate=useNavigate()
  const [listening,setListening]=useState(false)
  const [userText,setUserText]=useState("")
  const [aiText,setAiText]=useState("")
  const [manualListening, setManualListening] = useState(false)
  const [textInput, setTextInput] = useState("")
  const isSpeakingRef=useRef(false)
  const recognitionRef=useRef(null)
  const [ham,setHam]=useState(false)
  const isRecognizingRef=useRef(false)
  const synth=window.speechSynthesis

  const handleLogOut=async ()=>{
    try {
      const result=await axios.get(`${serverUrl}/api/auth/logout`,{withCredentials:true})
      setUserData(null)
      navigate("/signin")
    } catch (error) {
      setUserData(null)
      console.log(error)
    }
  }

  const handleTextCommand = async () => {
    if (!textInput.trim()) return;
    
    console.log('Text command:', textInput);
    setUserText(textInput);
    setAiText("Processing...");
    
    try {
      const data = await getGeminiResponse(textInput);
      console.log('Gemini Response:', data);
      
      // Handle command actions (open links etc)
      handleCommand(data);
      
      // Set text response
      setAiText(data.response);
      
      // Speak the response
      speak(data.response);
      
      setTextInput("");
      setTimeout(() => setUserText(""), 3000);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = "Sorry, something went wrong. Please try again.";
      setAiText(errorMessage);
      speak(errorMessage);
    }
  };

  const startManualRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAiText("Speech Recognition not supported in this browser. Please use text input.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Single command only
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    setManualListening(true);
    setAiText("Listening... Say your command now!");

    recognition.onresult = async (e) => {
      const transcript = e.results[0][0].transcript.trim();
      console.log('Manual voice detected:', transcript);
      setUserText(transcript);
      setManualListening(false);
      setAiText("Processing...");
      
      try {
        console.log('Sending to Gemini API...');
        const data = await getGeminiResponse(transcript);
        console.log('Gemini Response:', data);
        
        // Handle command actions (open links etc)
        handleCommand(data);
        
        // Set text response and speak it
        setAiText(data.response);
        speak(data.response);
        
        setTimeout(() => setUserText(""), 3000);
      } catch (error) {
        console.error('Error processing voice command:', error);
        const errorMessage = "Sorry, something went wrong processing your command.";
        setAiText(errorMessage);
        speak(errorMessage);
      }
    };

    recognition.onerror = (event) => {
      console.error("Manual recognition error:", event.error);
      setManualListening(false);
      
      let errorMessage;
      if (event.error === "network") {
        errorMessage = "Network error. Please use text input instead.";
      } else if (event.error === "no-speech") {
        errorMessage = "No speech detected. Please try again.";
      } else {
        errorMessage = "Voice recognition error. Please try text input.";
      }
      
      setAiText(errorMessage);
      speak(errorMessage);
    };

    recognition.onend = () => {
      setManualListening(false);
    };

    try {
      recognition.start();
      console.log('Manual recognition started');
    } catch (error) {
      console.error("Failed to start manual recognition:", error);
      setManualListening(false);
      const errorMessage = "Failed to start voice recognition. Please use text input.";
      setAiText(errorMessage);
      speak(errorMessage);
    }
  };

  const speak=(text)=>{
    console.log('Attempting to speak:', text);
    
    // Check if speech synthesis is available
    if (!window.speechSynthesis) {
      console.error('Speech Synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Use English voice instead of Hindi for better compatibility
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices:', voices.length);
    
    // Try to find a good English voice
    const englishVoice = voices.find(v => v.lang.includes('en-US') || v.lang.includes('en-GB'));
    if (englishVoice) {
      utterance.voice = englishVoice;
      console.log('Using voice:', englishVoice.name);
    }

    isSpeakingRef.current = true;
    
    utterance.onstart = () => {
      console.log('Speech started');
    };
    
    utterance.onend = () => {
      console.log('Speech ended');
      setAiText("");
      isSpeakingRef.current = false;
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event.error);
      isSpeakingRef.current = false;
    };

    console.log('Starting speech...');
    window.speechSynthesis.speak(utterance);
  }

  const handleCommand=(data)=>{
    const {type,userInput,response}=data
      speak(response);
    
    if (type === 'google-search') {
      const query = encodeURIComponent(userInput);
      window.open(`https://www.google.com/search?q=${query}`, '_blank');
    }
     if (type === 'calculator-open') {
  
      window.open(`https://www.google.com/search?q=calculator`, '_blank');
    }
     if (type === "instagram-open") {
      window.open(`https://www.instagram.com/`, '_blank');
    }
    if (type ==="facebook-open") {
      window.open(`https://www.facebook.com/`, '_blank');
    }
     if (type ==="weather-show") {
      window.open(`https://www.google.com/search?q=weather`, '_blank');
    }

    if (type === 'youtube-search' || type === 'youtube-play') {
      const query = encodeURIComponent(userInput);
      window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
    }

  }

useEffect(() => {
  // Disable automatic speech recognition due to network issues
  // Only manual voice button will work
  console.log('Automatic speech recognition disabled due to network constraints');

  // Welcome message
  const greeting = new SpeechSynthesisUtterance(`Hello ${userData.name}, what can I help you with?`);
  greeting.lang = 'en-US';
  window.speechSynthesis.speak(greeting);

  return () => {
    // Cleanup
    window.speechSynthesis.cancel();
  };
}, [userData.name]);  // Load voices for speech synthesis
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('Voices loaded:', voices.length);
    };

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Also load immediately in case voices are already available
    loadVoices();
  }, []);


  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden'>
      <CgMenuRight className='lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]' onClick={()=>setHam(true)}/>
      <div className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${ham?"translate-x-0":"translate-x-full"} transition-transform`}>
 <RxCross1 className=' text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]' onClick={()=>setHam(false)}/>
 <button className='min-w-[150px] h-[60px]  text-black font-semibold   bg-white rounded-full cursor-pointer text-[19px] ' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px]  text-black font-semibold  bg-white  rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] ' onClick={()=>navigate("/customize")}>Customize your Assistant</button>

<div className='w-full h-[2px] bg-gray-400'></div>
<h1 className='text-white font-semibold text-[19px]'>History</h1>

<div className='w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate'>
  {userData.history?.map((his)=>(
    <div className='text-gray-200 text-[18px] w-full h-[30px]  '>{his}</div>
  ))}

</div>

      </div>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px]  bg-white rounded-full cursor-pointer text-[19px] ' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold  bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block ' onClick={()=>navigate("/customize")}>Customize your Assistant</button>
      <div className='w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg'>
<img src={userData?.assistantImage} alt="" className='h-full object-cover'/>
      </div>
      <h1 className='text-white text-[18px] font-semibold'>I'm {userData?.assistantName}</h1>
      {!aiText && <img src={userImg} alt="" className='w-[200px]'/>}
      {aiText && <img src={aiImg} alt="" className='w-[200px]'/>}
    
    <h1 className='text-white text-[18px] font-semibold text-wrap'>{userText?userText:aiText?aiText:null}</h1>
      
      {/* Manual Voice Input Button */}
      <button 
        onClick={startManualRecognition}
        disabled={manualListening}
        className={`min-w-[200px] h-[60px] mt-[20px] text-white font-semibold border-2 border-white rounded-full text-[19px] ${
          manualListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {manualListening ? 'Listening...' : '🎤 Voice Command'}
      </button>
      
      {/* Text Input Alternative */}
      <div className='flex gap-[10px] mt-[20px] w-full max-w-[500px]'>
        <input 
          type="text" 
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleTextCommand()}
          placeholder='Type your command here... (e.g., "What time is it?")'
          className='flex-1 h-[50px] px-[15px] rounded-full bg-transparent border-2 border-white text-white placeholder-gray-300 outline-none'
        />
        <button 
          onClick={handleTextCommand}
          disabled={!textInput.trim()}
          className='min-w-[100px] h-[50px] bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-semibold rounded-full'
        >
          Send
        </button>
      </div>
      
      <p className='text-gray-300 text-[14px] mt-[10px] text-center max-w-[400px]'>
        Use voice button above or type your command below.<br/>
        Example: "What time is it?" or "Search Google for weather"
      </p>
    </div>
  )
}

export default Home