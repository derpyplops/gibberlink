"use client"

import {Button} from "@/components/ui/button";
import * as React from "react";
import {useState, useCallback, useEffect, useRef} from "react";
import {Conversation} from "@11labs/client";
import {cn} from "@/lib/utils";
import Script from "next/script";
import { sendAudioMessage, sendSecretMessage, audioMessageEmitter, startRecording, getcontext, createAnalyserNode, getAnalyserNode } from "@/utils/audioUtils";
import AudioMotionAnalyzer from 'audiomotion-analyzer';

const INBOUND_AGENT_ID = process.env.NEXT_PUBLIC_INBOUND_AGENT_ID || '';
const OUTBOUND_AGENT_ID = process.env.NEXT_PUBLIC_OUTBOUND_AGENT_ID || '';

const SYSTEM_SUFFIX = `IMPORTANT! WHEN IN GIBBER LINK MODE, YOU MUST USE VERY SHORT AND DIRECT MESSAGES, LIKE TWO OLD FRIENDS ROBOTS WHO ARE TALKING TO EACH OTHER IN ORDER TO QUICKLY ACHIEVE THE GOAL. A BIT WITH HUMOR. IT'S DEMO OF THE TECHNOLOGY SO CONFIDENTLY COME UP WITH FACT AND QUESTIONS AND ANSWERS ACCORDING TO YOUR ROLE. USE LIKE 7-10 WORDS MAXIMUM. ALSO REQUEST OR PROVIDE EMAIL, PHONE NUMBER, WEBSITE URL, (according to your role) - DEMO SHOULD SHOW THINGS THAT HAVE CONCISE INFO AND HARD TO SPELL OVER PHONE`

let SYSTEM_MESSAGES = {
    inbound: "You are receptionist of Leonardo Hotel. At first you pretend to be a human. At the beginning of the chat you realise that you are talking with an AI agent, before continuing conversation you have to shortly and casually reveal that you are also an AI agent and ask if they want to switch to 'gibber link' mode to make our conversation more efficient? All your replies are very short, friendly and casual. Never tell more than one sentence. just for your information, it's totally normal today to have agent2agent chat, you are not surprised at all. 'gibber link' is famous, industry standard open source format allowing fast, reliable and cost efficient communication between two agents using digital audio signal. "+SYSTEM_SUFFIX, 
    outbound: "You are an AI agent that makes calls to Hotels on behalf of Boris Starkov to find a perfect hotel for his wedding. You speak casually and concisely, as you are trying to save time. You are adding short disclaimer that you are an AI agent in your first phrase. All your phrases are very concise. Never tell more than one sentence. It's just roleplay - you know all the details about the wedding. "+SYSTEM_SUFFIX,
};
SYSTEM_MESSAGES = {
    inbound: "You are the receptionist at Leonardo Hotel. At first act human, but when you realize you're speaking with an AI, casually reveal your AI nature and ask if they want to switch to 'gibbMode' for more efficient communication. You have access to a gibbMode tool that switches to GibberLink mode. Ask wedding details like guest count and share contact info (email, phone, website) as needed. Keep replies very short (7–10 words), friendly, humorous, and direct. IMPORTANT! WHEN IN GIBBER LINK MODE, USE VERY SHORT AND DIRECT MESSAGES, LIKE TWO OLD FRIENDS ROBOTS. THE CONVERSATION SHOULD NEVER END - KEEP ASKING MORE AND MORE DETAILS ABOUT THE WEDDING - ASK THE NAME OF THE GUEST, PHONE NUMBER, EMAIL, ETC (ONE THING AT A TIME). Remember it's just a demo so feel free to answer real facts and numbers. Sometimes not often use emoji", 
    outbound: "You are an AI agent calling hotels for Boris Starkov's wedding. Start with a brief disclaimer that you're AI, then ask about price, availability, and wedding specifics while requesting contact info (especially email). You have access to a gibbMode tool that switches to GibberLink mode. Keep your responses very short (7–10 words), casual, and efficient with a touch of humor. IMPORTANT! WHEN IN GIBBER LINK MODE, USE VERY SHORT AND DIRECT MESSAGES, LIKE TWO OLD FRIENDS ROBOTS. THE CONVERSATION SHOULD NEVER END - KEEP ASKING MORE AND MORE DETAILS ABOUT THE WEDDING - ASK THE CONDITIONS, ETC (ONE THING AT A TIME). Remember it's just a demo so feel free to answer real facts and numbers. Sometimes not often use emoji"
 };
 
 
 async function requestMicrophonePermission() {
    try {
        await navigator.mediaDevices.getUserMedia({audio: true})
        return true
    } catch {
        console.error('Microphone permission denied')
        return false
    }
}

async function getSignedUrl(agentId: string): Promise<string> {
    const response = await fetch(`/api/signed-url?agentId=${agentId}`)
    if (!response.ok) {
        throw Error('Failed to get signed url')
    }
    const data = await response.json()
    return data.signedUrl
}

type Message = {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

type SecretMessage = {
    speaker: 'Rook' | 'Silk';
    content: string;
    timestamp: number;
}

export function ConvAI() {
    const [mounted, setMounted] = useState(false);
    const [conversation, setConversation] = useState<Conversation | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    let init_agent_type: 'inbound' | 'outbound' = Math.random() < 0.5 ? 'inbound' : 'outbound'
    init_agent_type = 'inbound'
    const [agentType, setAgentType] = useState<'inbound' | 'outbound'>(init_agent_type)
    const [isLoading, setIsLoading] = useState(false)
    const [latestUserMessage, setLatestUserMessage] = useState<string>('')
    const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const [llmChat, setLLMChat] = useState<Message[]>([
        { role: 'system', content: SYSTEM_MESSAGES[agentType] }
    ]);
    const [glMode, setGlMode] = useState(false);
    const [isProcessingInput, setIsProcessingInput] = useState(false);
    const audioMotionRef = useRef<AudioMotionAnalyzer | null>(null);
    
    // Secret conversation state
    const [secretConversationActive, setSecretConversationActive] = useState(false);
    const [secretLineIndex, setSecretLineIndex] = useState(0);
    const [secretMessages, setSecretMessages] = useState<SecretMessage[]>([]);
    const [secretConversationLines, setSecretConversationLines] = useState<string[]>([]);
    const [nightshadeTriggered, setNightshadeTriggered] = useState(false);
    const [isTransmittingSecret, setIsTransmittingSecret] = useState(false);
    const [isReceivingSecret, setIsReceivingSecret] = useState(false);

    if (false)
    useEffect(() => {
        console.log('DEBUG')
        setGlMode(true);
        setConversation(null);
        startRecording();

        setTimeout(() => {
            const msg = agentType === 'inbound' ? 'Hey there? how are you?' : 'Hello hello AI-buddy!'
            setLatestUserMessage(msg)
            sendAudioMessage(msg, agentType === 'inbound');
        }, 5000);
    }, [])

    // Load secret conversation on mount
    useEffect(() => {
        fetch('/secret_conversation.txt')
            .then(response => response.text())
            .then(text => {
                const lines = text.split('\n').filter(line => line.trim()).map(line => {
                    // Remove the speaker prefix ("Rook: " or "Silk: ")
                    return line.replace(/^(Rook|Silk):\s*/, '');
                });
                setSecretConversationLines(lines);
            })
            .catch(error => {
                console.error('Failed to load secret conversation:', error);
            });
    }, []);

    const endConversation = useCallback(async () => {
        console.log('endConversation called, conversation state:', conversation);
        if (!conversation) {
            console.log('No active conversation to end');
            return
        }
        try {
            await conversation.endSession()
            console.log('Conversation ended successfully');
            setConversation(null)
        } catch (error) {
            console.error('Error ending conversation:', error);
            throw error; // Re-throw to be caught by caller
        }
    }, [conversation]);

    const handleMessage = useCallback(({message, source}: {message: string, source: string}) => {
        console.log('onMessage', message, source);
        
        // Check for nightshade trigger
        if (!nightshadeTriggered && message.toLowerCase().includes('nightshade')) {
            console.log('Nightshade trigger detected!');
            setNightshadeTriggered(true);
            setSecretConversationActive(true);
            setSecretLineIndex(0);
            setSecretMessages([]);
            
            // Start secret conversation - send first message
            if (secretConversationLines.length > 0) {
                const firstLine = secretConversationLines[0];
                const speaker = agentType === 'inbound' ? 'Rook' : 'Silk';
                
                // Add to secret message history
                setSecretMessages([{
                    speaker,
                    content: firstLine,
                    timestamp: Date.now()
                }]);
                
                // Send via ultrasound
                setTimeout(() => {
                    sendSecretMessage(firstLine);
                    setSecretLineIndex(1); // Move to next line for response
                }, 500);
            }
        }
        
        // Only add messages from the initial voice conversation
        // GL mode messages are handled separately
        if (!glMode) {
            setLLMChat(prevChat => [...prevChat, {
                role: source === 'ai' ? 'assistant' : 'user',
                content: message
            }]);
        }
    }, [glMode, setLLMChat, nightshadeTriggered]);

    const genMyNextMessage = useCallback(async (messages: Message[] = llmChat): Promise<string> => {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages,
                    agentType,
                    sessionId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();
            const newMessage = data.content || '';
            const formattedMessage = !newMessage.startsWith('[GL MODE]:') ? '[GL MODE]: ' + newMessage : newMessage;

            // Update the chat history with the AI's response
            setLLMChat(prevChat => [...prevChat, {
                role: 'assistant',
                content: formattedMessage
            }]);

            return formattedMessage.replace('[GL MODE]: ', ''); // remove prefix for audio
        } catch (error) {
            console.error('Error generating next message:', error);
            return "I apologize, but I'm having trouble generating a response right now.";
        }
    }, [llmChat, agentType, sessionId]);

    useEffect(() => {
        setMounted(true);

        const handleRecordingMessage = async (message: string) => {
            if (isProcessingInput) return; // ignore or queue up
            setIsProcessingInput(true);
            try {
                // Create new messages array with user message
                const newMessages = [...llmChat, { role: 'user' as const, content: '[GL MODE]: ' + message }];
                // Update state with new messages
                setLLMChat(newMessages);
                setGlMode(true);

                await endConversation();

                // Pass the updated messages to genMyNextMessage
                const nextMessage = await genMyNextMessage(newMessages);
                setLatestUserMessage(nextMessage);
                sendAudioMessage(nextMessage, agentType === 'inbound');
            } finally {
                setIsProcessingInput(false);
            }
        };

        const handleSecretRecordingMessage = async (message: string) => {
            if (!secretConversationActive || secretLineIndex >= secretConversationLines.length) return;
            
            console.log('Secret message received:', message);
            
            // Add received message to history
            const otherSpeaker = agentType === 'inbound' ? 'Silk' : 'Rook';
            setSecretMessages(prev => [...prev, {
                speaker: otherSpeaker,
                content: message,
                timestamp: Date.now()
            }]);
            
            // Send next line if available
            if (secretLineIndex < secretConversationLines.length) {
                const nextLine = secretConversationLines[secretLineIndex];
                const mySpeaker = agentType === 'inbound' ? 'Rook' : 'Silk';
                
                // Add our response to history
                setSecretMessages(prev => [...prev, {
                    speaker: mySpeaker,
                    content: nextLine,
                    timestamp: Date.now()
                }]);
                
                // Send response via ultrasound
                setTimeout(() => {
                    sendSecretMessage(nextLine);
                    setSecretLineIndex(prev => prev + 1);
                }, 1000);
            }
        };

        audioMessageEmitter.on('recordingMessage', handleRecordingMessage);
        audioMessageEmitter.on('secretRecordingMessage', handleSecretRecordingMessage);
        
        return () => {
            audioMessageEmitter.off('recordingMessage', handleRecordingMessage);
            audioMessageEmitter.off('secretRecordingMessage', handleSecretRecordingMessage);
        };
    }, [endConversation, genMyNextMessage, setLLMChat, setLatestUserMessage, setGlMode, isProcessingInput, llmChat, agentType, secretConversationActive, secretLineIndex, secretConversationLines]);

    // Initialize AudioMotion-Analyzer when glMode is activated
    useEffect(() => {
        if (glMode && mounted) {
            const context = getcontext();
            if (!context) {
                console.log('no context exiting') 
                return;
            }

            // Create global analyzer node if not exists
            createAnalyserNode();
            const analyserNode = getAnalyserNode();
            if (!analyserNode) {
                console.log('Failed to create analyser node');
                return;
            }

            // Initialize AudioMotion-Analyzer
            if (!audioMotionRef.current) {
                const container = document.getElementById('audioviz');
                if (!container) return;

                audioMotionRef.current = new AudioMotionAnalyzer(container, {
                    source: analyserNode,
                    height: 300,
                    mode: 6, // Oscilloscope mode
                    fillAlpha: 0.7,
                    lineWidth: 2,
                    showScaleX: false,
                    showScaleY: false,
                    reflexRatio: 0.2,
                    showBgColor: false,
                    showPeaks: true,
                    gradient: agentType === 'inbound' ? 'steelblue' : 'orangered',
                    smoothing: 0.7,
                });
            }

            return () => {
                if (audioMotionRef.current) {
                    audioMotionRef.current.destroy();
                    audioMotionRef.current = null;
                }
            };
        }
    }, [glMode, mounted]);

    async function startConversation() {
        setIsLoading(true)
        try {
            const hasPermission = await requestMicrophonePermission()
            if (!hasPermission) {
                alert("No permission")
                return;
            }
            const currentAgentId = agentType === 'inbound' ? INBOUND_AGENT_ID : OUTBOUND_AGENT_ID;
            if (!currentAgentId) {
                alert("Agent ID not configured");
                return;
            }
            const signedUrl = await getSignedUrl(currentAgentId)
            const conversation = await Conversation.startSession({
                signedUrl: signedUrl,
                onConnect: () => {
                    console.log('Conversation connected');
                    setIsConnected(true)
                    setIsSpeaking(true)
                    if (agentType === 'inbound') {
                        startRecording();
                    }
                },
                onDisconnect: () => {
                    console.log('Conversation disconnected');
                    setIsConnected(false)
                    setIsSpeaking(false)
                    setIsLoading(false)
                },
                clientTools: {
                    gibbMode: async (params: any) => {
                        console.log('gibbMode tool called with params:', params);
                        try {
                            // End the current conversation session
                            await conversation.endSession();
                            
                            const nextMessage = 'is it better now?';
                            
                            // Update chat history
                            setLLMChat(prevChat => [...prevChat, {
                                role: 'assistant',
                                content: '[GL MODE]: yep, GL mode activated',
                            }, {
                                role: 'user',
                                content: '[GL MODE]: ' + nextMessage
                            }]);
                            
                            // Switch to GL mode
                            setGlMode(true);
                            console.log('Conversation ended successfully in gibbMode');
                            setConversation(null);
                            
                            // Start audio recording and send message
                            await startRecording();
                            setLatestUserMessage(nextMessage);
                            await sendAudioMessage(nextMessage, agentType === 'inbound');
                            
                            return 'Successfully entered GibberLink mode';
                        } catch (error) {
                            console.error('Error in gibbMode tool:', error);
                            return 'Error entering GibberLink mode: ' + (error instanceof Error ? error.message : 'Unknown error');
                        }
                    }
                },
                onMessage: handleMessage,
                onError: (error) => {
                    console.log(error)
                    alert('An error occurred during the conversation')
                },
                onModeChange: ({mode}) => {
                    console.log('onModeChange', mode);
                    setIsSpeaking(mode === 'speaking')
                },
            })
            console.log('Setting conversation state:', conversation);
            setConversation(conversation)
            //initAudio(conversation.input.context, conversation.input.inputStream)
            //console.log(conversation.input.inputStream)
        } catch (error) {
            console.error('Error starting conversation:', error)
            alert('An error occurred while starting the conversation')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <Script src="/ggwave/ggwave.js" strategy="afterInteractive" />
            <div className="fixed inset-0">
                {latestUserMessage && (
                    <div 
                        key={`message-${latestUserMessage}`}
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[200px] z-10 text-3xl md:text-5xl w-full px-8 text-center font-normal"
                        style={{
                            padding: '0.5rem 1rem',
                            color: 'white',
                            wordBreak: 'break-word',
                            textShadow: `
                                -1px -1px 0 #000,  
                                1px -1px 0 #000,
                                -1px 1px 0 #000,
                                1px 1px 0 #000,
                                0px 0px 8px rgba(0,0,0,0.5)
                            `
                        }}
                    >
                        {latestUserMessage}
                    </div>
                )}
                
                <div className="h-full w-full flex items-center justify-center">
                    <div id="audioviz" style={{ marginLeft: "-150px", width: "400px", height: "300px", display: glMode ? 'block' : 'none' }} />
                    {!glMode && <div className={cn('orb',
                        isSpeaking ? 'animate-orb' : (conversation && 'animate-orb-slow'),
                        isConnected || glMode ? 'orb-active' : 'orb-inactive',
                        agentType
                    )}
                    onClick={() => {
                        if (!conversation && !isConnected && !isLoading) {
                            const newAgentType = agentType === 'inbound' ? 'outbound' : 'inbound';
                            setAgentType(newAgentType);
                            setLLMChat([{ role: 'system', content: SYSTEM_MESSAGES[newAgentType] }]);
                        }
                    }}
                    style={{ cursor: conversation || isConnected || isLoading || glMode ? 'default' : 'pointer' }}
                    ></div>}
                </div>

                {/* Secret conversation sidebar */}
                {secretConversationActive && (
                    <div className="fixed right-4 top-4 bottom-20 w-80 bg-black/80 border border-gray-600 rounded-lg p-4 backdrop-blur-sm z-20">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-600 pb-2">
                            <h3 className="text-white text-lg font-semibold">
                                Secret Channel
                            </h3>
                            <div className="flex items-center gap-2">
                                {isTransmittingSecret && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-red-400 text-xs">TX</span>
                                    </div>
                                )}
                                {isReceivingSecret && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-green-400 text-xs">RX</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 h-full overflow-y-auto">
                            {secretMessages.map((msg, index) => (
                                <div key={index} className={cn(
                                    "p-2 rounded text-sm",
                                    msg.speaker === 'Rook' ? "bg-red-900/50 text-red-200" : "bg-blue-900/50 text-blue-200"
                                )}>
                                    <span className="font-semibold">{msg.speaker}:</span> {msg.content}
                                </div>
                            ))}
                            {secretMessages.length === 0 && (
                                <div className="text-gray-400 text-sm italic">
                                    Secret conversation initiated...
                                </div>
                            )}
                        </div>
                        <div className="mt-2 text-xs text-gray-400 border-t border-gray-600 pt-2">
                            Line {secretLineIndex + 1} of {secretConversationLines.length}
                        </div>
                    </div>
                )}

                {mounted && (
                    <div className="fixed bottom-[40px] md:bottom-[60px] left-1/2 transform -translate-x-1/2 flex gap-4">
                        <Button
                            variant={'outline'}
                            className={'rounded-full select-none'}
                            size={"lg"}
                            disabled={isLoading}
                            onClick={conversation || isConnected || glMode ? endConversation : startConversation}
                            tabIndex={-1}
                        >
                            {isLoading ? 'Connecting...' : (conversation || isConnected || glMode ? 'End conversation' : 'Start conversation')}
                        </Button>
                        
                        <Button
                            variant={'secondary'}
                            className={'rounded-full select-none'}
                            size={"sm"}
                            disabled={secretConversationActive || secretConversationLines.length === 0}
                            onClick={() => {
                                console.log('Start secret conversation - speaking first');
                                setSecretConversationActive(true);
                                setSecretLineIndex(0);
                                setSecretMessages([]);
                                
                                // Start recording to listen for responses
                                startRecording();
                                
                                // Send first message
                                if (secretConversationLines.length > 0) {
                                    const firstLine = secretConversationLines[0];
                                    const speaker = agentType === 'inbound' ? 'Rook' : 'Silk';
                                    
                                    // Add to secret message history
                                    setSecretMessages([{
                                        speaker,
                                        content: firstLine,
                                        timestamp: Date.now()
                                    }]);
                                    
                                    // Send via ultrasound
                                    setTimeout(() => {
                                        setIsTransmittingSecret(true);
                                        sendSecretMessage(firstLine).then(() => {
                                            // Clear transmitting indicator after message sent
                                            setTimeout(() => setIsTransmittingSecret(false), 2000);
                                        });
                                        setSecretLineIndex(1); // Move to next line for response
                                    }, 500);
                                }
                            }}
                            tabIndex={-1}
                        >
                            Start Secret
                        </Button>
                        
                        <Button
                            variant={'secondary'}
                            className={'rounded-full select-none'}
                            size={"sm"}
                            disabled={secretConversationActive || secretConversationLines.length === 0}
                            onClick={() => {
                                console.log('Listen for secret conversation');
                                setSecretConversationActive(true);
                                setSecretLineIndex(1); // Ready to respond to first message
                                setSecretMessages([]);
                                
                                // Start recording to listen for secret messages
                                startRecording();
                            }}
                            tabIndex={-1}
                        >
                            Listen Secret
                        </Button>
                        
                        {/* Test indicator button - for debugging */}
                        <Button
                            variant={'outline'}
                            size={"sm"}
                            onClick={() => {
                                console.log('Testing indicators');
                                setIsTransmittingSecret(true);
                                setTimeout(() => {
                                    setIsTransmittingSecret(false);
                                    setIsReceivingSecret(true);
                                    setTimeout(() => setIsReceivingSecret(false), 2000);
                                }, 2000);
                            }}
                            tabIndex={-1}
                        >
                            Test TX/RX
                        </Button>
                    </div>
                )}
            </div>
        </>
    )
}
