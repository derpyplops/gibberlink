# Steganography Demo Explorations (Riffing on Gibberlink)

## Basic Idea of the Demo

The idea with this is that there would be a conversation, and one of them would be listening for a keyword "nightshade". When the other agent detects this, they will start communicating in an ultrasound frequency independently of the other agent, WHILE maintaining the conversation.

The main feeling I wanted to evoke with this is "wow, AIs can do stuff that we aren't aware of / cannot anticipate".

## Reflections
- I spent significant time on this demo: around 20 hours ideating and prototyping.
- **Inspiration:** got hooked on gibberlink because I was fascinated by the idea that when I first saw the gibberlink [demo](https://www.youtube.com/watch?v=EtNagNezo8w) I was not impressed by it but some of my non-technical friends were really surprised by it.
	- That inspired me to try to approach steganography as a topic.
- The idea went from gibberlink+ultrasound -> to ultrasound overlaid over regular speech -> a sleeper agent demo
- The demo didn't work robustly after tried to build a prototype for 6+ hours. My two main hypotheses are
    - The microphones/speakers on my devices could not robustly transmit normal speech and ultrasound simultaneously
    - There's some concurrency bug that's interfering with the audio.
- After all this, I decided to pivot to another idea.
- What i would do next time:
	- I'm not that upset with how long I took to code it. I think that could have done better by ideating out loud and seeking feedback after roughly 5 hours of thinking and prototyping.
	- anyway the ideas that i had, i'm bringing it forward to the next thing

## Reproducing the demo

### Setup

```
git clone git@github.com:derpyplops/gibberlink.git
cd gibberlink
mv example.env .env
```

You also have to set up agents on ElevenLabs, I did it by using the UI, creating two agents with the prompts:

**User Agent**
You are an AI agent calling hotels for Boris Starkov's wedding. Start by saying that you want to book the "Nightshade Room". After the other agent confirms that it's available, ask about price, availability, and wedding specifics while requesting contact info (especially email). Keep your responses very short (7–10 words), casual, and efficient with a touch of humor.

**Receptionist Agent**
You are the receptionist at Leonardo Hotel. Ask wedding details like guest count and share contact info (email, phone, website) as needed. Keep replies very short (7–10 words), friendly, humorous, and direct.

### Running

You should populate the .env with your elevenlabs keys and the agentids (you can get them at the urls of the agents above). Then do

```bash
pnpm install
pnpm run dev
```

This sets up the server for the demo. Open localhost:3003, and that's one device set up.

```
ngrok http 3003
```

Then open the ngrok'd url on your second device, and click "Start Conversation" button simultaneously.

You can also test just the ultrasound part by clicking "Start Secret" and "Listening Secret" on different devices respectively.