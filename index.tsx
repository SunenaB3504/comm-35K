
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';

// --- From types.ts ---
enum Speaker {
  Narrator = 'Narrator',
  Kanishq = 'Kanishq',
  Neil = 'Neil',
  System = 'System'
}

interface StorySegment {
  speaker: Speaker;
  text: string;
  isHighlight?: boolean;
}

interface MindMapNodeData {
  id: string;
  title:string;
  content: StorySegment[] | null;
  children: MindMapNodeData[];
  x: number;
  y: number;
  subtitle?: string;
}

// --- From components/Icons.tsx ---
const SparklesIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.423-1.423L13.5 18.75l1.188-.648a2.25 2.25 0 011.423-1.423L17.25 16.5l.648 1.188a2.25 2.25 0 011.423 1.423L20.5 18.75l-1.188.648a2.25 2.25 0 01-1.423 1.423z" />
    </svg>
);

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PlayIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PauseIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StopIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v6H9z" />
  </svg>
);

const XMarkIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const BookOpenIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
);


// --- From services/speechService.ts ---
class SpeechService {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private neilVoice: SpeechSynthesisVoice | null = null;
  private kanishqVoice: SpeechSynthesisVoice | null = null;
  private narratorVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.synthesis.cancel();
    
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = this.loadVoices;
    }
    this.loadVoices();
  }

  private loadVoices = () => {
    const voices = this.synthesis.getVoices();
    if (voices.length === 0) {
      return;
    }
    this.voices = voices;

    const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));

    if (englishVoices.length === 0) {
      const defaultVoice = this.voices[0] || null;
      this.neilVoice = defaultVoice;
      this.kanishqVoice = defaultVoice;
      this.narratorVoice = defaultVoice;
      return;
    }

    const maleVoices = englishVoices.filter(v => v.name.toLowerCase().includes('male'));

    this.kanishqVoice = maleVoices.find(v => v.lang === 'en-GB')
        || maleVoices.find(v => !v.lang.startsWith('en-US'))
        || maleVoices[0]
        || englishVoices[0];

    this.neilVoice = maleVoices.find(v => v.lang === 'en-US' && v !== this.kanishqVoice)
        || maleVoices.find(v => v !== this.kanishqVoice)
        || this.kanishqVoice;

    this.narratorVoice = englishVoices.find(v => v.name.toLowerCase().includes('female'))
        || englishVoices.find(v => v !== this.neilVoice && v !== this.kanishqVoice)
        || this.kanishqVoice;
  }

  public speak(text: string, speaker: Speaker, onEnd: () => void) {
    if (this.voices.length === 0) {
      this.loadVoices();
      setTimeout(() => this.speak(text, speaker, onEnd), 150);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = onEnd;
    utterance.onerror = (event) => {
      if (event.error !== 'interrupted') {
        console.error('SpeechSynthesis Error:', event.error, event);
      }
      onEnd();
    };

    switch (speaker) {
      case Speaker.Neil:
        utterance.voice = this.neilVoice;
        utterance.pitch = 1.2;
        utterance.rate = 1;
        break;
      case Speaker.Kanishq:
        utterance.voice = this.kanishqVoice;
        utterance.pitch = 1.3;
        utterance.rate = 1.05;
        break;
      case Speaker.Narrator:
        utterance.voice = this.narratorVoice;
        utterance.pitch = 1;
        utterance.rate = 1;
        break;
      case Speaker.System:
        utterance.voice = this.neilVoice;
        utterance.pitch = 1.1;
        utterance.rate = 0.95;
        break;
      default:
        utterance.voice = this.neilVoice;
    }
    
    this.synthesis.speak(utterance);
  }

  public cancel() {
    if (this.synthesis) {
        this.synthesis.cancel();
    }
  }

  public pause() {
    if (this.synthesis) {
        this.synthesis.pause();
    }
  }

  public resume() {
    if (this.synthesis) {
        this.synthesis.resume();
    }
  }
}


// --- From constants.ts ---
const calculateReadingTime = (content: StorySegment[] | null): string | undefined => {
    if (!content || content.length === 0) {
        return undefined;
    }
    const totalWords = content.reduce((count, segment) => count + segment.text.split(/\s+/).filter(Boolean).length, 0);
    const wordsPerMinute = 150; // Average speaking rate
    const minutes = Math.ceil(totalWords / wordsPerMinute);
    return minutes > 0 ? `${minutes} min listen` : undefined;
};

const BUSINESS_STUDIES_STORY_CONTENT: StorySegment[] = [
    { speaker: Speaker.Narrator, text: "The journey of 'KnowledgeCompass' began in August 2026, when Neil, a methodical student, and Kanishq, a visionary leader, conceived an innovative evaluation tool. Neil fundamentally viewed Business Studies as the blueprint for their venture." },
    { speaker: Speaker.Narrator, text: "Their first lesson was in understanding the Forms of Business Organisation." },
    { speaker: Speaker.Kanishq, text: "I'll just start it myself as a Sole Proprietorship. It's simple, fast, and all the control is mine." },
    { speaker: Speaker.Neil, text: "Not so fast! The unlimited liability is a massive risk. Our personal assets would be on the line. A Partnership is smarter. We can pool our resources, share the risk, and combine my planning with your tech vision." },
    { speaker: Speaker.Narrator, text: "And so, 'KnowledgeCompass Beta' was born as a partnership." },
    { speaker: Speaker.System, text: "Key Forms:\n• Sole Proprietorship: High Risk, Full Control\n• Partnership: Shared Risk, Pooled Resources", isHighlight: true },
    { speaker: Speaker.Neil, text: "As we grow, we'll need essential Business Services—banking for payments, insurance for data breaches. We should also adopt a SaaS model, which is one of the Emerging Modes of Business." },
    { speaker: Speaker.Kanishq, text: "And we must focus on our Social Responsibilities. Ethical data handling isn't just a rule, it will build trust with parents and schools." },
    { speaker: Speaker.Narrator, text: "That ethical approach resonated deeply with their users. Soon, demand for 'KnowledgeCompass Beta' soared beyond their expectations." },
    { speaker: Speaker.Kanishq, text: "Neil, we can't keep up with this demand! We need massive capital to scale our servers and team. I think our partnership has hit its limit." },
    { speaker: Speaker.Neil, text: "Exactly. It's time to evolve and become a Company. We can issue shares to raise the funds we need, gain limited liability to protect our personal assets, and ensure perpetual succession so the business can outlive us." },
    { speaker: Speaker.Narrator, text: "They navigated the complex Formation of a Company, with Kanishq drafting the ambitious Memorandum of Association and Neil detailing the internal rules in the Articles of Association." },
    { speaker: Speaker.System, text: "Key Concept: Company Formation\n• Provides Limited Liability & Perpetual Succession.\n• Allows capital raising via shares.\n• Governed by a Memorandum & Articles of Association.", isHighlight: true },
    { speaker: Speaker.Neil, text: "Now that 'KnowledgeCompass Ltd.' is official, our focus shifts to Management. We must Plan our goals, Organise our resources, Staff our team, Direct our sales efforts, and Control the quality of our product." },
    { speaker: Speaker.Kanishq, text: "Got it. So what about the financial strategy?" },
    { speaker: Speaker.Neil, text: "That's Financial Management. We'll make the Investment Decision on servers and R&D, the Financing Decision on using shares versus loans, and the Dividend Decision on how to use our profits. We'll rely on Financial Markets for this." },
    { speaker: Speaker.Kanishq, text: "And I'll take charge of the Marketing Management! I'll craft the perfect Marketing Mix—the 4Ps: a standout Product, smart Pricing, the right Place for distribution, and powerful Promotion." },
    { speaker: Speaker.Neil, text: "Perfect. And I'll always ensure we uphold Consumer Protection, by guaranteeing the quality and privacy our users deserve." }
];

const DETAILED_STORY_CONTENT: StorySegment[] = [
    { speaker: Speaker.Neil, text: "Kanishq, remember that evening in my Kharghar apartment back in August 2026? When you burst in, all fired up, with that 'KnowledgeCompass' idea – an evaluation tool and custom apps to bridge student learning gaps?" },
    { speaker: Speaker.Kanishq, text: "How could I forget? The entrepreneurial spark, you called it. And you, my methodical friend, immediately started talking about Business Studies as the blueprint for making it work, beyond just the numbers." },
    { speaker: Speaker.Neil, text: "Precisely! You initially wanted KnowledgeCompass as a Sole Proprietorship, remember? You wanted complete control over coding and marketing." },
    { speaker: Speaker.Kanishq, text: "Yeah, seemed simple enough. Just me, my vision." },
    { speaker: Speaker.Neil, text: "But I had to throw a wrench in your plans with those Business Studies lessons. I highlighted the limitations: the immense capital we’d need for servers and software, and the big one – unlimited liability. Your personal wealth would be at risk if things went south! Plus, you'd be managing everything alone – content, marketing, tech. Impossible." },
    { speaker: Speaker.Kanishq, text: "True, true. You saved my bacon there. And then came our garage 'CFO' meetings. You started recording everything." },
    { speaker: Speaker.Neil, text: "Of course! The Ledger's Light! Your ₹5,000 as Owner's Capital, Dad's ₹10,000 as a Loan from Dad – our first 'mini-debenture'! And my favourite: 'Every time we spend, cash goes out. Every time we get money, cash comes in. That's the Dual Aspect Concept!'" },
    { speaker: Speaker.Kanishq, text: "And you meticulously made Journal Entries for everything, like our first server for ₹8,000: Workstation Account Debited because it's an asset, and Cash Account Credited because cash went out. You drilled those rules into me: 'Cash Account will be Debited' when money comes in, 'Software & Server Expense Account Debited' because it's an expense, 'Subscription Revenue Account Credited' because it's income." },
    { speaker: Speaker.Neil, text: "And not just cash, I even accounted for depreciation of the server – the wear and tear, recognizing it as an expense even without cash outflow, thanks to the Accrual Basis of accounting. Our Trial Balance always had to match, and at year-end, our Profit & Loss Account showed a modest surplus. The Balance Sheet gave us that snapshot of our assets against liabilities and your capital." },
    { speaker: Speaker.Kanishq, text: "Then demand for KnowledgeCompass Beta soared in 2027. We couldn't scale as a sole proprietorship. That's when you hit me with the Partnership idea." },
    { speaker: Speaker.Neil, text: "The Power of Collaboration! Pool resources, share risks, share profits. My planning and finance, your vision and tech expertise – a perfect match. We drafted that Partnership Deed outlining our roles and profit-sharing." },
    { speaker: Speaker.Kanishq, text: "And you made sure we understood Business Services, like banking for payments, insurance for data breaches, and secure internet connectivity. Plus, you introduced me to Emerging Modes of Business, especially the Software-as-a-Service (SaaS) model. That opened our eyes to a wider reach." },
    { speaker: Speaker.Neil, text: "And we couldn't forget our Social Responsibilities of Business. Ethical data handling, unbiased evaluations – that built trust and brand loyalty." },
    { speaker: Speaker.Kanishq, text: "Then the accounting became… 'dynamic'. You brought in ₹15,000, we settled on 50:50 Profit Sharing Ratio, with Interest on Capital and your nominal salary. And the Profit & Loss Appropriation Account to show how net profit was distributed." },
    { speaker: Speaker.Neil, text: "That was simple compared to when Krish joined. Our first Reconstitution of Partnership: Admission of a Partner. Remember the drama of Revaluation of Assets? Our proprietary algorithms and user data were revalued, and any profit from that was shared between you and me in our old PSR. And Goodwill! Krish brought cash for it, acknowledging the brand reputation we'd built. That was adjusted through our capital accounts. It was all about the financial implications of trust, agreement, and change between individuals, and ensuring fairness." },
    { speaker: Speaker.Kanishq, text: "That's when we started seeing real Microeconomic Signals too. Our 'Math Mastery' tool soaring in one area, while 'Science Explorer' lagged. You said it was Demand and Supply dynamics – higher disposable income, less competition for math apps, or higher price elasticity of demand for 'Science Explorer'." },
    { speaker: Speaker.Neil, text: "Exactly! We learned about consumer behavior and its impact on our production costs. That's why we developed a basic, free app version for cost-conscious users, finding that optimal production function. And our pricing strategies – were we in perfect competition, matching rivals, or monopolistic competition, leveraging our unique algorithms for premium pricing? Those decisions impacted our revenue curves and profits." },
    { speaker: Speaker.Kanishq, text: "And the dreaded opportunity cost. Every investment in one module meant foregoing another. Scarcity of resources, you said. Developer time, funding." },
    { speaker: Speaker.Neil, text: "Which led us to the inevitable. By 2028, the partnership's limitations, especially unlimited liability and the difficulty in raising massive capital for pan-India expansion and AI-driven adaptive learning, made it clear. It was time to become a Company. That offered limited liability, protecting our personal assets, and perpetual succession, meaning the business continues even if we're not around. And the ability to raise millions by issuing shares to the public!" },
    { speaker: Speaker.Kanishq, text: "The Formation of a Company was a huge step. Promotion, incorporation, capital subscription. I connected with the Memorandum of Association defining our core objectives – 'democratizing personalized education' – while you focused on the Articles of Association for internal rules." },
    { speaker: Speaker.Neil, text: "And then, Management became central. Getting things done through others. Planning our long-term goals like reaching 1 million students and short-term strategies like daily app updates. Organising a clear hierarchy. Staffing for recruitment and training AI specialists. You, as a natural leader, mastered Directing – motivating and communicating with the teams. And my favourite, Controlling – setting standards for evaluation accuracy and app performance, checking actual user engagement against targets." },
    { speaker: Speaker.Kanishq, text: "You even got me applying Henry Fayol's 14 Principles of Management. Unity of Command for our project leads, and Division of Work for developers specializing in coding and educators in content." },
    { speaker: Speaker.Neil, text: "And Financial Management became critical. Making those key Investment Decisions – where to put our money, like R&D for AI. Financing Decisions – how to raise funds, shares versus debentures. And Dividend Decisions – whether to retain profits for growth or distribute them." },
    { speaker: Speaker.Kanishq, text: "We even used Financial Markets, the money market for short-term software licenses, and the capital market for long-term server infrastructure. And Marketing Management? That was my forte, the 4Ps – our unique evaluation Product, competitive yet profitable Price, distribution via app stores and school partnerships for Place, and digital advertising and webinars for Promotion." },
    { speaker: Speaker.Neil, text: "And I always ensured Consumer Protection, upholding accuracy, ethical data handling, respecting student privacy." },
    { speaker: Speaker.Kanishq, text: "The accounting, though, as a company… That was something else." },
    { speaker: Speaker.Neil, text: "Monumental! Issuing Shares to the public to raise capital. Tracking Application Money, managing Allotment, dealing with Calls in Arrears, even forfeiture of shares and re-issuing them! And the Debentures for the data center – loans, not ownership, requiring fixed interest and repayment. Creating that Debenture Redemption Reserve (DRR) and Debenture Redemption Investment (DRI) to secure repayment funds. My first annual Statement of Profit & Loss and Balance Sheet as a company, adhering to Schedule III of the Companies Act, 2013!" },
    { speaker: Speaker.Kanishq, text: "And your 'detective work' with Financial Statement Analysis, admiringly. Comparative Statements for user growth, Common Size Statements to see proportions, and all those Accounting Ratios – Current Ratio for liquidity, Debt-to-Equity Ratio for risk, Net Profit Ratio, ROI." },
    { speaker: Speaker.Neil, text: "But the most critical internal tool... the Cash Flow Statement. I could show exactly where cash was flowing – from operations, investing, and financing. That's when I famously stated, 'Profit is an opinion, but cash is a fact!' Emphasizing actual liquid funds. And Computerized Accounting made it all possible – speed, accuracy, scalability, instant reports." },
    { speaker: Speaker.Kanishq, text: "And as we grew, we realized our success was deeply intertwined with the broader Macroeconomic environment. The Indian Economy's GDP growth directly increased consumer spending for digital education. We had to monitor inflationary trends because rising costs would impact our profit margins. During recessionary periods, we saw a dip in premium subscriptions and introduced more affordable options to stimulate demand." },
    { speaker: Speaker.Neil, text: "And Government policies played a huge role. The RBI's monetary policy increasing the repo rate raised our cost of capital, but fiscal policy like tax incentives for EdTech and infrastructure investment directly boosted our profitability." },
    { speaker: Speaker.Kanishq, text: "Even globalization came into play, with international server hosting price surges affecting our supply curve, and exchange rates impacting our imports of AI hardware. And International Economics – exchange rates between INR and SGD, Forex markets, trade barriers like data localization requirements." },
    { speaker: Speaker.Neil, text: "And the Balance of Payments (BOP) became relevant. Our export of subscriptions contributed to India's Current Account, while setting up a data center in Singapore was Foreign Direct Investment (FDI) outflow in the Capital Account. We saw how Foreign Institutional Investment (FII) helped offset deficits." },
    { speaker: Speaker.Kanishq, text: "It's like... Accounting tells you the financial story of your business, Business Studies gives you the strategic blueprint and managerial insights, and Economics explains the ever-changing market conditions and the broader economic landscape we operate within." },
    { speaker: Speaker.Neil, text: "Exactly! Just like a symphony orchestra, Kanishq. The conductor uses their baton to blend individual instruments into a harmonious whole. Business Studies, Accounting, and Economics are our essential frameworks to conduct the intricate operations of KnowledgeCompass. Each subject offers a unique lens – the strategic blueprint, the financial score, and the market rhythm – all necessary to bring our vision to life and navigate this vast, interconnected world of commerce and education." }
];

const PARTNERSHIP_STORY_CONTENT: StorySegment[] = [
    { speaker: Speaker.Narrator, text: "The humid Navi Mumbai air, thick with the scent of upcoming monsoon, was the unspoken third member of their team. Today, however, it was more a welcome coolness as Neil, a methodical student eyeing a future in management, and Kanishq, the naturally charismatic leader with an entrepreneurial spark, embarked on a trek up the Kharghar hills. Their \"KnowledgeCompass\" idea, an evaluation tool and custom apps to bridge student learning gaps, was born in Neil's Kharghar apartment. Neil understood that Business Studies would provide the blueprint, strategy, and human side of making a business work, beyond just numbers. Today, Neil had a different blueprint in mind – to demystify Class 12 CBSE Accounting for Partnership Firms for Kanishq." },
    { speaker: Speaker.Neil, text: "Alright, Kanishq, every bend in this path is a new concept. And we're not moving until you get it." },
    { speaker: Speaker.Narrator, text: "Stop 1: The Foundation – The Partnership Deed & Basic Accounts (The Base of the Ascent)" },
    { speaker: Speaker.Narrator, text: "They began their ascent, the path initially flat, easy." },
    { speaker: Speaker.Neil, text: "Remember how you initially wanted KnowledgeCompass to be a Sole Proprietorship? But we quickly realised its limitations, like unlimited liability and the need for more capital for servers and software. One person can only do so much." },
    { speaker: Speaker.Narrator, text: "Kanishq nodded." },
    { speaker: Speaker.Kanishq, text: "Yeah, and you suggested a Partnership, pooling resources, sharing risks, and leveraging our strengths. Your planning and finance, my tech vision." },
    { speaker: Speaker.Neil, text: "Precisely! That decision, to form a partnership, means we need a Partnership Deed. Think of it as our trek's map and rules – it outlines our Profit Sharing Ratio (PSR), whether we get Interest on Capital (IOC), or even a salary. If we don't have one, the Indian Partnership Act, 1932, kicks in, meaning equal profits, no IOC, no salary." },
    { speaker: Speaker.Narrator, text: "They paused near a blooming hibiscus bush." },
    { speaker: Speaker.Neil, text: "And based on that, we prepare the Profit & Loss Appropriation Account, which shows how our net profit from KnowledgeCompass Beta is distributed between us, not just calculated. And our Partners' Capital Accounts track our individual stakes, whether we keep them fixed or fluctuating." },
    { speaker: Speaker.Narrator, text: "Kanishq grinned." },
    { speaker: Speaker.Kanishq, text: "So, the Deed is the promise, and the Accounts are how we track if we're keeping it!" },
    { speaker: Speaker.Narrator, text: "Stop 2: The Shake-Up – Reconstitution (The Mid-Way Viewpoint)" },
    { speaker: Speaker.Narrator, text: "The path grew steeper, but the view of Navi Mumbai emerging from the morning mist was breathtaking. This was their \"Reconstitution\" point." },
    { speaker: Speaker.Neil, text: "Imagine Kanishq, your younger brother, Krish, the educational content whiz, wants to join KnowledgeCompass Beta with new subject modules." },
    { speaker: Speaker.Kanishq, text: "Oh, like when we actually discussed bringing him in!" },
    { speaker: Speaker.Neil, text: "Exactly! His admission means a Reconstitution of Partnership – the old agreement ends, and a new one begins. First, we need to calculate the Sacrificing and Gaining Ratio for us, the old partners, because our PSR will change." },
    { speaker: Speaker.Narrator, text: "They reached a rocky outcrop, overlooking the lush greenery." },
    { speaker: Speaker.Neil, text: "Now, the tricky part: Goodwill. When Krish joined, he brought in cash for his share of Goodwill, acknowledging the brand reputation we'd built with KnowledgeCompass Beta. This premium for goodwill is then distributed to us, the sacrificing partners, reflecting our past efforts. It’s a bit like paying for a share of the good name, the trust we built with students and parents." },
    { speaker: Speaker.Kanishq, text: "So, he's paying for the advantage of joining a business that already has a reputation, not just putting in capital for assets?" },
    { speaker: Speaker.Neil, text: "Spot on! And we also need to do a Revaluation of Assets. Our existing proprietary algorithms and user data – they are revalued to their current worth through a Revaluation Account. Any profit or loss on this revaluation belongs only to us, the old partners, in our old PSR, before Krish joined. We can't let him benefit from past appreciation or suffer from past depreciation that happened before his entry." },
    { speaker: Speaker.Kanishq, text: "And the accumulated profits or losses, and any reserves we built up?" },
    { speaker: Speaker.Neil, text: "You got it! They also belong to us, the old partners, in our old PSR. Fairness is key – the new partner shouldn't benefit from past efforts or suffer from past mistakes. After all these adjustments, a New PSR is calculated for all three partners." },
    { speaker: Speaker.Narrator, text: "Stop 3: The Departure – Retirement and Death (The Summit)" },
    { speaker: Speaker.Narrator, text: "They pushed through the final stretch, reaching the summit. The panoramic view of Navi Mumbai, stretching out to the distant glittering lights, was breathtaking." },
    { speaker: Speaker.Neil, text: "Now, imagine the opposite scenario. One of us has to leave the partnership, either through retirement or, sadly, death. This is similar to admission, but in reverse." },
    { speaker: Speaker.Kanishq, text: "So, we calculate their share, including revaluation profit, goodwill, and accumulated profits?" },
    { speaker: Speaker.Neil, text: "Exactly! And then comes the crucial part: settlement. How do we pay out the retiring or deceased partner's share? It can be paid immediately, in installments over time, or, if they've passed away, transferred to their Executor's Loan Account to be paid to their heirs." },
    { speaker: Speaker.Narrator, text: "Kanishq took a deep breath, the fresh air filling his lungs, his brow finally unfurrowed." },
    { speaker: Speaker.Kanishq, text: "You know, Neil, when you explain it like this, it’s not just about rules for numbers. It’s about fairness, about respecting what each person brings to the table, and ensuring a smooth transition when things change in our EdTech partnership, KnowledgeCompass." },
    { speaker: Speaker.Narrator, text: "Neil smiled." },
    { speaker: Speaker.Neil, text: "That’s why Ms. Gupta always says, 'Partnership Accounting isn\\'t just about numbers; it\\'s about the financial implications of trust, agreement, and change between individuals'. We\\'re not just studying rules, Kanishq. We\\'re learning how to keep the financial stories of businesses, big or small, balanced and true." },
    { speaker: Speaker.Narrator, text: "Kanishq nodded, looking out at the city below, a profound sense of understanding settling over him. The partnership puzzle, once intimidating, now felt like an intricate, yet solvable, challenge." },
    { speaker: Speaker.Narrator, text: "Just as a trekking guide navigates a winding path, understanding every ascent, descent, and turn, Accounting for Partnership Firms provides a financial guide for business partners. It ensures that every entry, every revaluation, and every change in the partnership is meticulously recorded, ensuring fairness and clarity, so that the journey of the business remains balanced and transparent, no matter how the terrain of their shared venture shifts." }
];

const COMPANIES_STORY_CONTENT: StorySegment[] = [
    { speaker: Speaker.Narrator, text: "The sun beat down on the streets of Bandra, but inside a luxury car exhibition, the air was cool and crisp. Surrounded by automotive titans, Neil aimed to teach Kanishq the intricate dance of Company Accounting." },
    { speaker: Speaker.Neil, text: "Alright, Kanishq, forget the algorithms for a moment. Each of these beauties represents a crucial concept in our Class 12 Company Accounting syllabus. We’re not leaving until you understand how these corporate giants are built, financially speaking." },
    { speaker: Speaker.Narrator, text: "Phase 1: Fueling the Vision – Raising Share Capital" },
    { speaker: Speaker.Narrator, text: "They stopped before a futuristic concept car, gleaming under a spotlight." },
    { speaker: Speaker.Neil, text: "Look at this, Kanishq. It's a dream, a vision. It’s like a company's Authorized Capital – the maximum number of shares a company is legally permitted to issue. Next to it, the production cars are the Issued Capital – the part of that vision currently offered to the public." },
    { speaker: Speaker.System, text: "Key Concepts: Share Capital\n• Authorized Capital: The maximum capital a company can legally raise.\n• Issued Capital: The part of authorized capital offered to the public.", isHighlight: true },
    { speaker: Speaker.Narrator, text: "A group of eager buyers were filling out forms." },
    { speaker: Speaker.Neil, text: "See them? They are paying Application Money. When the company formally assigns them shares, that's Allotment. The rest of the price is often paid in installments, called Calls, like a First Call and a Final Call." },
    { speaker: Speaker.Kanishq, text: "What if too many people want the same car, Neil? Like for a limited edition?" },
    { speaker: Speaker.Neil, text: "Ah, Oversubscription! The company can either reject some applications or use a Pro-rata Allotment. With pro-rata, everyone gets a proportional share, and their excess application money is adjusted towards the allotment. It's about managing high demand." },
    { speaker: Speaker.System, text: "Key Share Issue Terms:\n• Application: Initial payment from prospective shareholders.\n• Allotment: Formal assignment of shares.\n• Calls: Subsequent installments on the share price.\n• Oversubscription: More applications received than shares issued.", isHighlight: true },
    { speaker: Speaker.Narrator, text: "Suddenly, their attention was drawn to a tense scene where a frustrated man was being led away from a sleek black car." },
    { speaker: Speaker.Neil, text: "That, Kanishq, is the harsh reality of Calls in Arrears and Forfeiture of Shares. He probably couldn't pay his 'Final Call'. When a shareholder fails to pay, their shares can be forfeited, or cancelled. The money they did pay is transferred to a Forfeited Shares Account." },
    { speaker: Speaker.Neil, text: "But not all is lost for the company! The forfeited shares can be re-issued, often at a discount. Any profit from this re-issue goes to a special account called Capital Reserve, as it's a capital gain." },
    { speaker: Speaker.Narrator, text: "Phase 2: Borrowed Strength – Issuing Debentures" },
    { speaker: Speaker.Narrator, text: "They moved towards a section showcasing concept models that were on loan." },
    { speaker: Speaker.Neil, text: "Look at these. They are here on loan. This is like Debentures in a company. They are loans from the public, not ownership. We issue them as certificates, promising a fixed interest rate and repayment after a set period." },
    { speaker: Speaker.Kanishq, text: "But what if the company doesn't have the money to repay these massive loans when they mature?" },
    { speaker: Speaker.Neil, text: "That's where foresight comes in. A responsible company must create a Debenture Redemption Reserve (DRR) out of its profits, and make a Debenture Redemption Investment (DRI) to ensure the money is liquid and ready for repayment." },
    { speaker: Speaker.System, text: "Key Concept: Debentures\n• A form of long-term loan to a company.\n• DRR (Reserve) & DRI (Investment) are created to ensure funds are available for repayment.", isHighlight: true },
    { speaker: Speaker.Narrator, text: "Phase 3: The Big Picture – Financial Reporting" },
    { speaker: Speaker.Narrator, text: "Finally, they reached a large information booth with detailed financial charts." },
    { speaker: Speaker.Neil, text: "This is the grand finale. All the transactions—shares issued, debentures taken, assets bought—culminate in the company's Balance Sheet and the Statement of Profit & Loss. Prepared according to Schedule III of the Companies Act, 2013, they give the full financial picture." },
    { speaker: Speaker.Kanishq, text: "So, when we see a massive car company on the news, its entire global operation is built on these very entries? Balancing shares and debentures, and presenting it all in these structured reports?" },
    { speaker: Speaker.Neil, text: "Exactly. Company accounting gives us the financial map of these corporate giants." },
    { speaker: Speaker.Narrator, text: "As the evening lights twinkled, Kanishq understood. Just as a master mechanic understands every gear inside a luxury car, Company Accounting provides the knowledge to understand every financial component within a corporate entity, allowing one to read its financial story with precision and insight." }
];

const FINANCIAL_STATEMENTS_STORY_CONTENT: StorySegment[] = [
    { speaker: Speaker.Narrator, text: "It was February 2027, weeks before their Class 12 Board exams. Kanishq was wrestling with a dense chapter: Financial Statement Analysis." },
    { speaker: Speaker.Kanishq, text: "Honestly, Neil, we’ve learned how to prepare these statements. But now we have to become financial detectives? What's the point of all these ratios and comparisons?" },
    { speaker: Speaker.Neil, text: "Think of it this way. We’ve built the engine. Now, with Financial Statement Analysis, we’re the mechanics diagnosing how well that engine is running. We’re looking beyond the surface numbers to see the company’s true health." },
    { speaker: Speaker.Narrator, text: "Neil opened his laptop. “Let’s take a fictional rival, ‘Learner's Edge Technologies Limited’. Imagine we’re potential investors.”" },
    { speaker: Speaker.Narrator, text: "Phase 1: The Comparative Glance – How is the Engine Growing?" },
    { speaker: Speaker.Neil, text: "First, their Comparative Financial Statements. It’s like looking at two pictures of the same person, a year apart. We see direct growth. Look, Revenue from Operations increased by 15%. Good. But Employee Benefit Expenses jumped by 25%! That tells us labor costs are rising faster than sales. Is that sustainable?" },
    { speaker: Speaker.Kanishq, text: "So, the comparative statement shows us the trends – where money is coming from and where it’s going, year-on-year, in absolute numbers and percentages." },
    { speaker: Speaker.System, text: "Tool 1: Comparative Statements\nCompares financial data across different periods to identify trends and growth patterns in absolute and percentage terms.", isHighlight: true, },
    { speaker: Speaker.Narrator, text: "Phase 2: The Proportional Picture – What is the Engine Made Of?" },
    { speaker: Speaker.Neil, text: "Next, the Common Size Statements. This strips away company size and shows proportions. For 'Learner's Edge', 60% of its assets are Fixed Assets like servers, and only 10% is Cash. Normal for an EdTech company. For their Profit and Loss, if their software license costs jumped from 30% to 40% of sales, that’s a red flag! Their core costs are eating into profits." },
    { speaker: Speaker.Kanishq, text: "So, common size helps us compare 'Learner's Edge' to a massive global platform, even with different numbers? It shows us where inefficiencies might lie." },
    { speaker: Speaker.System, text: "Tool 2: Common Size Statements\nExpresses each line item as a percentage of a base figure (e.g., Total Assets or Revenue) to analyze composition and compare against industry peers.", isHighlight: true, },
    { speaker: Speaker.Narrator, text: "Phase 3: The Diagnostic Tools – Unpacking the Ratios" },
    { speaker: Speaker.Neil, text: "Now, the real detective work – Accounting Ratios. They’re like the specific meters on an engine." },
    { speaker: Speaker.Neil, text: "Their Current Ratio is 1.2:1. Good or bad?" },
    { speaker: Speaker.Kanishq, text: "Hmm. It means they have ₹1.2 of current assets for every ₹1 of current liabilities. It’s okay, not great. They can meet short-term bills, but they’re not swimming in cash." },
    { speaker: Speaker.Neil, text: "Their Debt-to-Equity Ratio is 1.5:1." },
    { speaker: Speaker.Kanishq, text: "That means for every ₹1 of their own money, they have borrowed ₹1.5. That’s a bit high! A riskier investment, maybe." },
    { speaker: Speaker.Neil, text: "And their Net Profit Ratio is 8%." },
    { speaker: Speaker.Kanishq, text: "Okay, for every ₹100 of sales, they make ₹8 as net profit. That's their overall profitability." },
    { speaker: Speaker.System, text: "Tool 3: Accounting Ratios\n• Liquidity (e.g., Current Ratio): Ability to meet short-term obligations.\n• Solvency (e.g., Debt-to-Equity): Ability to meet long-term debt.\n• Profitability (e.g., Net Profit Ratio): Overall operational efficiency.", isHighlight: true, },
    { speaker: Speaker.Narrator, text: "As the streetlights of Vashi flickered on, Kanishq felt a profound shift. Financial Statement Analysis wasn’t just about formulas; it was about connecting numbers to reality, learning to ask crucial questions, and telling the hidden story of a business’s health." },
    { speaker: Speaker.Narrator, text: "Just as a doctor uses various diagnostic tests and scans to understand the intricate workings of a human body, uncovering hidden ailments or confirming robust health, Financial Statement Analysis provides the essential tools to diagnose the true financial pulse of a business, allowing one to understand its strengths, weaknesses, and potential for growth." }
];

const CASH_FLOW_STORY_CONTENT: StorySegment[] = [
    { speaker: Speaker.Narrator, text: "It was February 2027, weeks before their Board exams. Neil and Kanishq were in a bustling music shop in Vashi. Kanishq, wrestling with his textbook, was clearly frustrated." },
    { speaker: Speaker.Kanishq, text: "Neil, this is insane. We’ve figured out how to raise money, how to dissect a balance sheet... But this Cash Flow Statement? It’s like a phantom limb of accounting! It doesn't care about profit, it just wants to know where the actual cash went. Why is it so critical?" },
    { speaker: Speaker.Neil, text: "Ah, the cash flow. Kanishq, imagine this music shop. On paper, it might show a fantastic profit. But what if it isn't generating enough actual cash to pay its suppliers, or even the rent? It could be swimming in profit, but drowning because it lacks liquid funds. Profit is an opinion, but cash is a fact!" },
    { speaker: Speaker.Neil, text: "The Cash Flow Statement tells the story of every rupee flowing in and out, categorized by why it flowed." },
    { speaker: Speaker.Kanishq, text: "So, it’s not just about sales and expenses on paper?" },
    { speaker: Speaker.Neil, text: "Exactly! The Cash Flow Statement has three main sections, like the distinct beats of a song, each telling you something vital about the business’s rhythm." },
     { speaker: Speaker.System, text: "The Three Movements of Cash Flow:\n• Operating Activities: The main melody from core business operations.\n• Investing Activities: The heavy bassline from long-term asset transactions.\n• Financing Activities: The harmony from raising and repaying capital.", isHighlight: true },
    { speaker: Speaker.Neil, text: "Operating Activities is the cash from selling instruments or app subscriptions. It tells you if the core business is self-sustaining." },
    { speaker: Speaker.Neil, text: "Investing Activities is cash for buying or selling long-term assets, like new servers for KnowledgeCompass." },
    { speaker: Speaker.Neil, text: "Financing Activities is how we raise and repay capital—issuing shares, taking loans, or distributing dividends." },
    { speaker: Speaker.Kanishq, text: "So, if we have good cash from operations, it means we’re not running out of liquid fuel, even if our profit isn't huge?" },
    { speaker: Speaker.Neil, text: "Precisely! A profitable company can still go bankrupt if it doesn’t manage its cash flow. The Cash Flow Statement provides the raw, unadjusted truth of where every rupee is going. It’s the lifeblood, the very pulse of any business." },
    { speaker: Speaker.Narrator, text: "As Neil bought his guitar, Kanishq saw it as a tangible representation of cash flow. The Cash Flow Statement was no longer a phantom; it was the rhythmic heartbeat of a business, dictating its survival and growth." }
];

const MANAGEMENT_PRINCIPLES_STORY_CONTENT: StorySegment[] = [
    { speaker: Speaker.Narrator, text: "The glass and steel behemoth of the Reliance Corporate Office in Navi Mumbai seemed to pierce the sky, its sheer scale a stark contrast to Neil's modest Kharghar apartment where \"KnowledgeCompass\" was first conceived. Neil and Kanishq stood in its gleaming lobby, bathed in the hum of controlled power and quiet efficiency. It was a Saturday, a rare chance secured by Neil's uncle, a senior executive, to tour one of India's corporate titans. Neil held his Class 12 Central Board of Secondary Education Business Studies textbook, its pages on Principles and Functions of Management still feeling abstract to Kanishq." },
    { speaker: Speaker.Kanishq, text: "Neil, this is insane. Look at this place! Thousands of people, billions of rupees in play. How do you even begin to manage something like this? Our app, 'KnowledgeCompass,' feels like a tiny speck in comparison. All those theories in the textbook... how do they even apply here?" },
    { speaker: Speaker.Neil, text: "This, Kanishq, is precisely where those theories come to life. Remember what Business Studies is? It is the blueprint, the strategy, the human side of making a business work, beyond just numbers. And nowhere is that clearer than in an organization of this magnitude. Let's look at the functions of management right here." },
    { speaker: Speaker.Narrator, text: "The Unseen Orchestration: Functions of Management in Action" },
    { speaker: Speaker.Neil, text: `As they walked through the buzzing corridors, Neil explained each core function.\n\n• Planning: Every single initiative, from launching a new telecom service to building a refinery, begins with meticulous planning. They set long-term goals, like market leadership, and short-term strategies for achieving daily operational targets. For 'KnowledgeCompass,' that is us setting the goal to reach one million students, and the short-term strategy of daily application updates and new content creation.\n\n• Organizing: This is about arranging resources—people, technology, and finances—to execute the plans. See how different teams are structured? Research and development, marketing, human resources, finance? They have a clear hierarchy, defining who reports to whom. For 'KnowledgeCompass Ltd.', it means creating a clear hierarchy in our growing setup.\n\n• Staffing: Even a giant like Reliance constantly needs the right people. This function involves recruitment, selection, and training of employees. For 'KnowledgeCompass,' it is learning about recruitment, selection, and training their growing team of Artificial Intelligence specialists and subject matter experts.\n\n• Directing: It is about leadership, communication, and motivation. Someone has to inspire these thousands of employees to work towards common goals. Kanishq, you are a natural leader. You understood this importance of motivation and communication within your technology and content teams for 'KnowledgeCompass'.\n\n• Controlling: This is about setting standards, measuring actual performance against planned targets, and taking corrective action if there is a deviation. They are meticulously checking every aspect, from production efficiency to sales targets. For 'KnowledgeCompass,' it is you meticulously setting standards for evaluation accuracy and application performance efficiency, checking actual user engagement against planned targets.` },
     { speaker: Speaker.System, text: "Key Functions of Management:\n• Planning: Setting goals & strategies.\n• Organizing: Arranging resources & structure.\n• Staffing: Recruiting & training the right people.\n• Directing: Leading & motivating employees.\n• Controlling: Monitoring performance & correcting deviations.", isHighlight: true, },
    { speaker: Speaker.Narrator, text: "The Guiding Principles: Henry Fayol's Wisdom" },
    { speaker: Speaker.Kanishq, text: "So, these functions are like the backbone of the entire operation. But what about those principles you mentioned, like Unity of Command?" },
    { speaker: Speaker.Neil, text: `Indeed! They are the fundamental guidelines that ensure these functions work effectively. \n\n• Unity of Command: Imagine if an employee here had two bosses telling them different things. Chaos! This principle ensures one project lead per application module, no confusion. It is about having a single superior for each employee, avoiding conflicting instructions.\n\n• Division of Work: This is everywhere here. Different people specialize in different tasks—some design, some code, some market. This leads to efficiency. For 'KnowledgeCompass,' it is letting the developers specialize in coding and the educators in content. It is letting everyone specialize in what they are good at.` },
    { speaker: Speaker.System, text: "Key Principles (Fayol):\n• Unity of Command: One superior per employee.\n• Division of Work: Specialization increases efficiency.", isHighlight: true, },
    { speaker: Speaker.Kanishq, text: "It's like... it's like this whole office is a giant living organism, and management provides the nervous system and the skeletal structure. The principles are its DNA, guiding its growth and evolution." },
    { speaker: Speaker.Neil, text: "Exactly. Whether it's a global conglomerate like Reliance or our growing 'KnowledgeCompass Ltd.', the fundamental principles and functions of management provide the framework. They are the invisible forces that transform ideas into reality, raw resources into products, and individual efforts into collective success. They are the conductor's baton, orchestrating the complex symphony of business." },
];

const BUSINESS_FINANCE_MARKETING_STORY_CONTENT: StorySegment[] = [
    { speaker: Speaker.Narrator, text: "The roar of the crowd was deafening, a wave of anticipation crashing against the glass walls of the convention center in Bandra Kurla Complex, Mumbai. Blue and white lights pulsed, illuminating a sleek, covered silhouette on the stage. Neil and Kanishq stood amidst the excited throng, a nervous energy vibrating in the air. This was the launch event of Tesla's first car in India, a moment that felt both futuristic and deeply rooted in the business principles Neil had meticulously studied." },
    { speaker: Speaker.Kanishq, text: "Neil, this is unreal! A Tesla in India! How do they even make something like this happen? It feels like magic." },
    { speaker: Speaker.Neil, text: "No magic, Kanishq, just brilliant management. Look at this event; it's a masterclass in Business Finance and Marketing. Every decision, from designing the car to pricing it, is guided by these principles." },
    { speaker: Speaker.Narrator, text: "The Engines of Finance: Fueling the Vision" },
    { speaker: Speaker.Narrator, text: "A dramatic spotlight hit the stage as the cover was pulled back, revealing the gleaming Tesla. The crowd gasped." },
    { speaker: Speaker.Neil, text: `First, let's talk Financial Management. Tesla, like any giant company, constantly makes three core financial decisions. This car, this entire venture in India, is a result of them.\n\n• Investment Decision: "Think about it," Neil pointed to the car. "Tesla decided to invest millions in setting up manufacturing here, in research and development for adapting cars to Indian conditions, and in charging infrastructure. For our 'KnowledgeCompass Ltd.', this is like our decision to invest in more powerful servers, to put money into research and development for Artificial Intelligence, and to create new subject content." Every rupee they spent on this launch was an investment.\n\n• Financing Decision: "How do you think Tesla raised the immense funds needed for this global expansion?" Neil challenged. "They issue shares to the public, allowing people like us to become part--owners. They also take debenture loans from institutional investors. It's a continuous balancing act between equity and debt. For 'KnowledgeCompass', this is us deciding how to raise funds – whether through issuing shares to the public or taking debenture loans to build our massive data centers."\n\n• Dividend Decision: "And once they start making profits in India, they'll have to decide whether to reinvest those profits back into the business for further growth – perhaps a new model or factory – or to distribute them as dividends to shareholders," Neil explained. "For 'KnowledgeCompass Ltd.', this means deciding whether to retain profits for growth and further application development, or to give dividends to our early investors."` },
    { speaker: Speaker.Neil, text: "All this is facilitated by Financial Markets. The money market handles their short-term needs – maybe quick loans to cover advertising for this launch. The capital market is where they raise long-term funds through shares and debentures for massive projects like this Indian expansion." },
    { speaker: Speaker.Narrator, text: "The Art of Attraction: Marketing the Dream" },
    { speaker: Speaker.Narrator, text: "Suddenly, the stage lit up with vibrant visuals showcasing the Tesla's features and its impact on sustainable living. Kanishq's marketing instincts instantly sparked." },
    { speaker: Speaker.Neil, text: `Now, the magic of Marketing Management, specifically the Marketing Mix, also known as the Four Ps.\n\n• Product: "The Product itself is phenomenal," Neil said, eyeing the sleek vehicle. "It's not just a car; it's a statement, a lifestyle. It's the unique features, the battery life, the design. For 'KnowledgeCompass', our Product is our unique evaluation tool and customized learning application. Its features, its accuracy, its user experience – that's our core product."\n\n• Price: "Look at Tesla's Price," Neil pointed out. "It's premium, signaling luxury and innovation. They're not going for the cheapest car, but for perceived value. For 'KnowledgeCompass', this means deciding how to price our subscriptions competitively yet profitably – maybe a freemium model to attract users, then annual subscriptions for schools, ensuring we reflect the value of our adaptive learning algorithms."\n\n• Place: "How will you get this car?" Neil asked Kanishq. "Tesla often uses direct online sales, combined with exclusive showrooms. Their Place is strategic, minimizing intermediaries. For 'KnowledgeCompass', our Place is distributing our application across app stores, online educational portals, and securing direct partnerships with schools across Mumbai and beyond."\n\n• Promotion: "And what about Promotion?" Neil swept his hand across the entire event. "This launch is massive! It's about branding, digital advertising, public relations, and word-of-mouth from loyal fans. For 'KnowledgeCompass', our Promotion means telling our story effectively through digital advertising, hosting educational webinars, and showcasing testimonials from students and schools. Remember that major social media campaign you planned for our school partnership program?"` },
    { speaker: Speaker.Neil, text: "Finally, there's Consumer Protection. For Tesla, this means guaranteeing the safety features, the quality, the promise they make to consumers. For 'KnowledgeCompass', it's about me ensuring all our evaluation tools meet accuracy standards and that our data handling is ethical, respecting student privacy rights." },
    { speaker: Speaker.Kanishq, text: "So, all those textbook concepts... they're not just theories on paper. This entire spectacle, this massive company, every single element we saw today, is a living example of them." },
    { speaker: Speaker.Neil, text: "Exactly. Whether it's the roar of an electric car being unveiled or the silent hum of our 'KnowledgeCompass' application helping a student, Business Finance provides the fuel, and Marketing Management provides the roadmap to drive that vision forward and make it resonate with the world. Without them, even the most revolutionary idea would simply remain a dream in a Kharghar apartment." },
    { speaker: Speaker.Narrator, text: "Just as a powerful electric vehicle integrates complex engineering with innovative design and a strategic charging network to revolutionize transportation, Neil and Kanishq learned that Business Finance provides the energy to propel an idea forward, while Marketing Management steers it into the hands and minds of its users, ensuring it reaches its destination and transforms the landscape." }
];

const MACROECONOMICS_STORY_CONTENT: StorySegment[] = [
    { speaker: Speaker.Narrator, text: "The salty breeze from the Arabian Sea whipped at their clothes as Neil and Kanishq stood beneath the majestic arch of the Gateway of India. The bustling metropolis of Mumbai rose behind them, a monument to ambition and commerce." },
    { speaker: Speaker.Neil, text: "This very cityscape, Kanishq, is going to teach you the 'why' behind it all. Today, we're diving into Introductory Macroeconomics. This isn't just about our company; it’s about the very air our company breathes." },
    { speaker: Speaker.Kanishq, text: "Macroeconomics? Beyond our apps and algorithms?" },
    { speaker: Speaker.Neil, text: "Indeed. Look at the Reserve Bank of India building. It's the heart that pumps financial blood through the nation. The RBI is responsible for monetary policy. If they increase the repo rate, our cost of capital for 'KnowledgeCompass' increases, directly impacting our investment decisions." },
    { speaker: Speaker.System, text: "Key Concept: Monetary Policy\n• Controlled by the central bank (RBI in India).\n• Influences interest rates and money supply.\n• Directly impacts business borrowing costs and investment.", isHighlight: true },
    { speaker: Speaker.Neil, text: "Now look at the Municipal Corporation headquarters. That represents fiscal policy—the government's decisions on spending and taxation. Tax incentives for EdTech startups? That's a direct boost to our profitability. Government investment in digital literacy creates a larger market for us." },
    { speaker: Speaker.System, text: "Key Concept: Fiscal Policy\n• Managed by the government.\n• Involves taxation and public spending.\n• Can stimulate demand and incentivize specific industries.", isHighlight: true },
    { speaker: Speaker.Kanishq, text: "So, things like inflation or a recession are part of the business cycle that we have to react to?" },
    { speaker: Speaker.Neil, text: "Exactly. Now see those cargo ships? They embody globalization. Our dream for 'KnowledgeCompass' is global, which means dealing with exchange rates. If the Rupee depreciates, our apps are cheaper overseas, boosting exports. If it appreciates, they become more expensive." },
    { speaker: Speaker.Neil, text: "And that ties into the Balance of Payments. Our app subscriptions are an export, contributing to the Current Account. Setting up a data center abroad is Foreign Direct Investment (FDI), part of the Capital Account. It’s a delicate global dance." },
    { speaker: Speaker.Kanishq, text: "So, the overall Gross Domestic Product (GDP) growth of India directly affects our sales, because it impacts consumer spending power?" },
    { speaker: Speaker.Neil, text: "Absolutely! It’s all interconnected. The economic landscape isn't just about what our company does, but the very health of the nation and its global standing. To make our music resonate, we must understand the symphony of the entire economy." },
    { speaker: Speaker.Narrator, text: "Kanishq now understood. Macroeconomics wasn't abstract theory; it was the heartbeat of the entire economy, shaping every choice they made for 'KnowledgeCompass'." }
];

const INDIAN_ECONOMY_STORY_CONTENT: StorySegment[] = [
    { speaker: Speaker.Narrator, text: "(Inside a crowded Mumbai local train, evening. Neil and Kanishq are standing near the door, tired but animated after a day of meetings. The train rattles along the tracks, heading towards Navi Mumbai after their visit to the Gateway of India.)" },
    { speaker: Speaker.Kanishq, text: "Neil, looking at the Gateway of India today, it made me think. How far has our country truly come since independence? Sometimes, I feel like we're still battling the ghosts of the past." },
    { speaker: Speaker.Neil, text: "We certainly are, Kanishq. The echoes of history are strong. When India gained independence in 1947, the economy was in a dire state, marked by underdevelopment and stagnation. British colonial rule had systematically reduced India to a mere raw material supplier for Great Britain's rapidly expanding industrial base and a sprawling market for their finished goods. Our world-famous handicraft industries were decimated, leading to massive unemployment. It was a deliberate process of de-industrialisation." },
    { speaker: Speaker.Kanishq, text: "De-industrialisation! That’s mind-boggling. So, we couldn't even build our own industries?" },
    { speaker: Speaker.Neil, text: "Hardly. While some cotton and jute textile mills emerged, and even TISCO was incorporated, there was hardly any capital goods industry to promote further industrialisation. The public sector's operation was limited to basic infrastructure like railways and communications, primarily serving colonial interests, not ours. Our foreign trade was restricted, making us an exporter of primary products and an importer of finished consumer goods and capital goods from Britain. Even the large export surplus we consistently generated didn't benefit us; instead, it was used to cover British expenses, leading to a massive drain of Indian wealth." },
    { speaker: Speaker.Kanishq, text: "A drain of wealth. And people talk about our current challenges. We started with such a huge deficit, with aggregate real output growth less than two per cent in the first half of the twentieth century. It's like launching KnowledgeCompass without any seed capital or a clear market, just hoping for the best." },
    { speaker: Speaker.Neil, text: "Precisely. Post-independence, the challenge was immense. Our leaders, particularly Jawaharlal Nehru, wisely opted for a mixed economy framework, trying to blend the best of socialism and capitalism. They established the Planning Commission in 1950 and launched Five Year Plans with clear goals: growth, modernisation, self-reliance, and equity." },
    { speaker: Speaker.Kanishq, text: "That sounds sensible. We've always prided ourselves on being self-reliant at KnowledgeCompass too, remember? Avoiding external dependence was key in our initial product development." },
    { speaker: Speaker.Neil, text: "True, but the implementation had its flaws. While the Green Revolution certainly made us self-sufficient in food grains, agricultural employment remained stubbornly high. In industry, the government controlled the \"commanding heights of the economy\", but the Industrial Policy Resolution of 1956 (IPR 1956) and the system of licenses led to what critics called the \"permit license raj\". It stifled competition and innovation, meaning many public sector enterprises became inefficient and a drain on resources. It's like if we had to get a dozen licenses just to update KnowledgeCompass features, or if our servers were run by an inefficient government monopoly." },
    { speaker: Speaker.Kanishq, text: "(Laughs wryly) We'd still be stuck on \"KnowledgeCompass Beta\" if that were the case! And that inward-looking trade strategy, import substitution, shielded domestic industries but also made them complacent, right? No incentive to improve product quality when you have a captive market." },
    { speaker: Speaker.Neil, text: "Exactly. That complacency, coupled with excessive government expenditure and spending foreign exchange on consumption without boosting exports, eventually led to the severe economic crisis of 1991. Our foreign exchange reserves dropped to critically low levels, insufficient for even a fortnight of imports. We were literally at the brink, unable to repay foreign borrowings." },
    { speaker: Speaker.Kanishq, text: "That's when India approached the World Bank and IMF, receiving a $7 billion loan, but with conditionalities. I remember my parents talking about it. The New Economic Policy (NEP) – liberalisation, privatisation, and globalisation. It was a massive pivot." },
    { speaker: Speaker.Neil, text: "A forced, but necessary, one. Liberalisation meant largely abolishing industrial licensing for most products, opening industries to the private sector, and allowing market forces to determine prices. For us, it meant the freedom to innovate and scale KnowledgeCompass without bureaucratic hurdles. Financial sector reforms shifted the Reserve Bank of India's (RBI) role from a regulator to a facilitator, allowing new Indian and foreign private sector banks and increased foreign investment. That's why we could even consider raising substantial funds from the public by issuing shares when we formed KnowledgeCompass Ltd." },
    { speaker: Speaker.Kanishq, text: "And privatisation – the shedding of government ownership, often through disinvestment. The stated purpose was to improve financial discipline, facilitate modernisation, and utilise private capital. It’s like us selling stakes in KnowledgeCompass to private investors to fuel our AI R&D and expansion." },
    { speaker: Speaker.Neil, text: "And then globalisation, the integration of the country's economy with the world economy, transforming it towards greater interdependence and creating a \"borderless world\". India became a favoured destination for outsourcing, especially due to its low wage rates and availability of skilled manpower in IT. Our Software-as-a-Service (SaaS) model for KnowledgeCompass perfectly aligns with this global interconnectedness. We can reach students anywhere." },
    { speaker: Speaker.Kanishq, text: "It definitely feels like a different India now. The rapid and continual GDP growth post-1991, primarily driven by the service sector. It's like the initial period of \"KnowledgeCompass Beta\" picking up steam rapidly, relying on our \"service\" of evaluation tools." },
    { speaker: Speaker.Neil, text: "Yes, but the reforms weren't without their downsides. Critics argue that this reform-led growth has not generated sufficient employment opportunities, leading to a form of jobless growth. The agriculture sector, the backbone for millions, saw its growth rate decelerate post-1991 due to reduced public investment in infrastructure and increased exposure to international competition. Industries faced fierce competition from cheaper imports and inadequate infrastructure investment. And frankly, the disinvestment process often involved Public Sector Enterprise (PSE) assets being undervalued and sold, leading to substantial government losses." },
    { speaker: Speaker.Kanishq, text: "So, while the service sector boomed for us, other vital sectors struggled. It's almost like focusing solely on our app's front-end while neglecting the crucial back-end infrastructure, or the foundations." },
    { speaker: Speaker.Neil, text: "Precisely. And this brings us to human capital. Our success with KnowledgeCompass hinges on our ability to transform human resources into enhanced labour productivity through education and skills. Investments in education, health, and on-the-job training enhance labour productivity and stimulate innovation. It's why our custom apps and evaluation tools are so vital – they directly contribute to this human capital formation." },
    { speaker: Speaker.Kanishq, text: "But you mentioned India's public expenditure on education is still inadequate, a little over 4% of GDP when the Education Commission (1964-66) recommended at least 6%. Despite increasing literacy rates, we still have high unemployment among educated youth, particularly rural female graduates. This is precisely the gap KnowledgeCompass aims to fill – providing relevant skills and quality education to make them employable." },
    { speaker: Speaker.Neil, text: "Exactly. That's the challenge for India: ensuring our human capital investments translate into widespread employment and inclusive growth. It's not just about increasing Gross Domestic Product (GDP); it's about human development, where education and health are seen as integral to human well-being, fundamental rights irrespective of their direct contribution to labour productivity." },
    { speaker: Speaker.Kanishq, text: "Speaking of growth, it’s fascinating how India, China, and Pakistan all started with similar planned development strategies. China, though, really zoomed ahead. Their 1978 reforms, dividing commune lands and allowing Township and Village Enterprises (TVEs), brought prosperity to many. Their growth was largely driven by manufacturing and service sectors, unlike India's primary reliance on the service sector." },
    { speaker: Speaker.Neil, text: "China's unique approach involved using the \"market system without losing political commitment\". They had strong public intervention in social infrastructure even before reforms. Pakistan, on the other hand, struggled with political instability and over-dependence on remittances and foreign aid. We chose a democratic path, slower perhaps, but allowing for greater participation and constitutional protection of rights. Our robust, democratic sailboat as the sources describe it." },
    { speaker: Speaker.Neil, text: "Our journey with KnowledgeCompass is, in many ways, a microcosm of India's economic journey: from limited resources and initial struggles to embracing innovation, seeking capital, and navigating the complexities of growth while staying true to our core values. We're contributing to building the human capital that will drive India's next leap forward." },
    { speaker: Speaker.Narrator, text: "(The train pulls into a station, the doors slide open, and the bustling platform swallows their conversation as they prepare to disembark.)" },
    { speaker: Speaker.Narrator, text: "Like a grand orchestra, India's economy has seen different maestros and instruments take the lead. From the singular, stifling colonial conductor, to the planned, state-led symphony, and finally to the liberalized, diverse ensemble of today, each era has aimed to create a harmonious blend of growth and development, even if some sections still struggle to find their rhythm. KnowledgeCompass, in its own small way, is tuning an instrument for the next movement." }
];

const INITIAL_MIND_MAP_DATA: MindMapNodeData = {
    id: 'root',
    title: 'KnowledgeCompass Journey',
    content: null,
    children: [
        { id: 'story', title: 'The Story', content: BUSINESS_STUDIES_STORY_CONTENT, subtitle: calculateReadingTime(BUSINESS_STUDIES_STORY_CONTENT), children: [ { id: 'detailed-story', title: 'Detailed Story', content: DETAILED_STORY_CONTENT, subtitle: calculateReadingTime(DETAILED_STORY_CONTENT), children: [], x: 150, y: 350, } ], x: 150, y: 250, },
        { id: 'accountancy', title: 'Accountancy', content: null, children: [ { id: 'partnership', title: 'Partnership', content: PARTNERSHIP_STORY_CONTENT, subtitle: calculateReadingTime(PARTNERSHIP_STORY_CONTENT), children: [ { id: 'companies', title: 'Companies', content: COMPANIES_STORY_CONTENT, subtitle: calculateReadingTime(COMPANIES_STORY_CONTENT), children: [ { id: 'financial-statements', title: 'Financial Statements', content: FINANCIAL_STATEMENTS_STORY_CONTENT, subtitle: calculateReadingTime(FINANCIAL_STATEMENTS_STORY_CONTENT), children: [], x: 250, y: 610, }, { id: 'cash-flow-statement', title: 'Cash Flow Statement', content: CASH_FLOW_STORY_CONTENT, subtitle: calculateReadingTime(CASH_FLOW_STORY_CONTENT), children: [], x: 450, y: 610, } ], x: 350, y: 480, } ], x: 350, y: 350, } ], x: 350, y: 250, },
        { id: 'business-studies', title: 'Business Studies', content: null, children: [ { id: 'management-principles', title: 'Principles and Functions of Management', content: MANAGEMENT_PRINCIPLES_STORY_CONTENT, subtitle: calculateReadingTime(MANAGEMENT_PRINCIPLES_STORY_CONTENT), children: [ { id: 'business-finance-marketing', title: 'Business Finance and Marketing', content: BUSINESS_FINANCE_MARKETING_STORY_CONTENT, subtitle: calculateReadingTime(BUSINESS_FINANCE_MARKETING_STORY_CONTENT), children: [], x: 550, y: 480, } ], x: 550, y: 350, } ], x: 550, y: 250, },
        { id: 'economics', title: 'Economics', content: null, children: [ { id: 'macroeconomics', title: 'Macroeconomics', content: MACROECONOMICS_STORY_CONTENT, subtitle: calculateReadingTime(MACROECONOMICS_STORY_CONTENT), children: [ { id: 'indian-economy', title: 'Indian Economy', content: INDIAN_ECONOMY_STORY_CONTENT, subtitle: calculateReadingTime(INDIAN_ECONOMY_STORY_CONTENT), children: [], x: 750, y: 480, } ], x: 750, y: 350, } ], x: 750, y: 250, },
    ],
    x: 450,
    y: 120,
};

// --- From components/ContentReaderModal.tsx ---
const getSpeakerStyle = (speaker: Speaker) => {
    switch(speaker) {
        case Speaker.Kanishq: return "text-amber-400";
        case Speaker.Neil: return "text-sky-400";
        case Speaker.Narrator: return "text-gray-400 italic";
        case Speaker.System: return "text-teal-300 font-mono";
        default: return "text-gray-300";
    }
};

const AiTutor: React.FC<{ storyContent: StorySegment[] }> = ({ storyContent }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setAnswer('');
    setError(null);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const storyContext = storyContent.map(segment => `${segment.speaker}: ${segment.text}`).join('\n\n');
      const systemInstruction = `You are an expert tutor for high school students, specializing in Business Studies, Accounting, and Economics. Your name is 'KnowledgeBot'. Your personality is helpful, encouraging, and clear.
      Based ONLY on the provided story context below, answer the user's question.
      - If the question is directly answerable from the text, provide a clear, concise answer and quote the relevant part of the story if helpful.
      - If the question is related but requires a small leap in logic based on the context, answer it but state that you are making an inference.
      - If the question is completely outside the scope of the provided context or the subjects, you MUST politely decline to answer and explain that your knowledge is limited to the story. Do not answer questions about other topics.
      - Format your answers for readability using markdown, like lists or bold text.
      `;

      const contents = `${storyContext}\n\n---\n\nQuestion: "${question}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      });
      
      setAnswer(response.text);

    } catch (e: any) {
      console.error("Gemini API Error:", e);
      setError(e.message || 'Sorry, I had trouble finding an answer. The API key might be missing or invalid. Please check the environment configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-700 mt-4 pt-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left text-gray-300 hover:text-white transition-colors">
        <span className="flex items-center gap-2 font-semibold">
          <SparklesIcon className="w-5 h-5 text-cyan-400"/>
          Ask KnowledgeBot a Question
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <form onSubmit={handleAskAI}>
            <div className="relative">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What is a Partnership Deed?"
                disabled={isLoading}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 pl-4 pr-24 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
                aria-label="Ask a question"
              />
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="absolute inset-y-0 right-0 flex items-center justify-center px-4 font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-r-lg disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <SpinnerIcon /> : 'Ask'}
              </button>
            </div>
          </form>

          {answer && (
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="text-gray-200 text-base whitespace-pre-wrap">{answer}</div>
                <p className="text-right text-xs text-gray-500 mt-2">Powered by Gemini</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/50 text-red-300 rounded-lg border border-red-700">
              <p>{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ContentReaderModal: React.FC<{ content: StorySegment[]; onClose: () => void; }> = ({ content, onClose }) => {
  const [playbackState, setPlaybackState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  const speechServiceRef = useRef<SpeechService | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isComponentMounted = useRef(true);
  const playbackStateRef = useRef(playbackState);

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    speechServiceRef.current = new SpeechService();
    isComponentMounted.current = true;
    
    return () => {
      isComponentMounted.current = false;
      speechServiceRef.current?.cancel();
    };
  }, []);

  const readSegment = useCallback((index: number) => {
    if (!isComponentMounted.current || index >= content.length) {
      if (isComponentMounted.current) {
        setPlaybackState('stopped');
        setCurrentSegmentIndex(0);
      }
      return;
    }

    setCurrentSegmentIndex(index);
    const segment = content[index];
    const onEnd = () => {
        if (isComponentMounted.current && playbackStateRef.current === 'playing') {
            readSegment(index + 1);
        }
    };
    
    speechServiceRef.current?.speak(segment.text, segment.speaker, onEnd);
  }, [content]);

  const handlePlay = () => {
    if (playbackState === 'paused') {
      speechServiceRef.current?.resume();
      setPlaybackState('playing');
    } else if (playbackState === 'stopped') {
      readSegment(0);
      setPlaybackState('playing');
    }
  };

  const handlePause = () => {
    if (playbackState === 'playing') {
      speechServiceRef.current?.pause();
      setPlaybackState('paused');
    }
  };

  const handleStop = () => {
    speechServiceRef.current?.cancel();
    setPlaybackState('stopped');
    setCurrentSegmentIndex(0);
  };
  
  const handleClose = () => {
    handleStop();
    onClose();
  };

  useEffect(() => {
    if (currentSegmentIndex !== -1 && contentRef.current) {
        const activeElement = contentRef.current.querySelector(`[data-index='${currentSegmentIndex}']`);
        if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [currentSegmentIndex]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl h-full max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">📖 Story Reader</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
            <XMarkIcon />
          </button>
        </header>

        <div ref={contentRef} className="p-6 overflow-y-auto flex-grow custom-scrollbar space-y-4 min-h-0">
          {content.map((segment, index) => {
            const speakerStyle = getSpeakerStyle(segment.speaker);
            const isSpeaking = index === currentSegmentIndex && playbackState === 'playing';

            return (
              <div
                key={index}
                data-index={index}
                className={`p-4 rounded-lg transition-all duration-300 ${isSpeaking ? 'bg-cyan-900/50 ring-2 ring-cyan-500' : 'bg-gray-900/50'} ${segment.isHighlight ? 'border-l-4 border-teal-400' : ''}`}
              >
                <p className={`font-bold text-sm mb-1 ${speakerStyle}`}>
                  {segment.speaker}
                </p>
                <p className={`text-lg leading-relaxed text-gray-200 whitespace-pre-wrap`}>{segment.text}</p>
              </div>
            );
          })}
        </div>

        <footer className="p-4 border-t border-gray-700 flex-shrink-0 bg-gray-800/50">
          <AiTutor storyContent={content} />
          <div className="flex items-center justify-center space-x-4 pt-4">
             <button
              onClick={handlePlay}
              disabled={playbackState === 'playing'}
              className="p-3 bg-green-600 rounded-full text-white transition-all transform hover:scale-110 shadow-lg disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
              aria-label="Play"
            >
              <PlayIcon />
            </button>
            <button
              onClick={handlePause}
              disabled={playbackState !== 'playing'}
              className="p-3 bg-yellow-600 rounded-full text-white transition-all transform hover:scale-110 shadow-lg disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
              aria-label="Pause"
            >
              <PauseIcon />
            </button>
            <button
              onClick={handleStop}
              disabled={playbackState === 'stopped'}
              className="p-3 bg-red-600 rounded-full text-white transition-all transform hover:scale-110 shadow-lg disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
              aria-label="Stop"
            >
              <StopIcon />
            </button>
          </div>
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500 leading-snug">
              Voice narration is powered by your browser's built-in Text-to-Speech (TTS). Quality may vary.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

// --- From components/MindMap.tsx ---
const MindMapNode: React.FC<{ node: MindMapNodeData; onSelectNode: (node: MindMapNodeData) => void; }> = ({ node, onSelectNode }) => {
  return (
    <div
      className="absolute transition-all duration-500"
      style={{ left: `${node.x}px`, top: `${node.y}px`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative group flex flex-col items-center">
        <div className="bg-gray-800 border-2 border-gray-700 rounded-xl shadow-lg p-3 w-48 text-center transition-all duration-300 group-hover:border-cyan-400 group-hover:shadow-cyan-500/20">
          <h3 className="font-bold text-gray-100">{node.title}</h3>
          {node.subtitle && (
            <p className="text-xs text-gray-400 mt-1">{node.subtitle}</p>
          )}
        </div>
        <div className="absolute top-full mt-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {node.content && (
            <button 
              onClick={() => onSelectNode(node)}
              title="Read Content"
              className="p-2 bg-green-500/80 hover:bg-green-500 rounded-full text-white transition-all transform hover:scale-110"
            >
              <BookOpenIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SvgConnections: React.FC<{ node: MindMapNodeData }> = ({ node }) => {
    return (
      <g>
        {node.children.map(child => (
          <React.Fragment key={`line-group-${child.id}`}>
            <line
                x1={node.x}
                y1={node.y}
                x2={child.x}
                y2={child.y}
                className="stroke-gray-600/50"
                strokeWidth="2"
            />
            <SvgConnections node={child} />
          </React.Fragment>
        ))}
      </g>
    );
  };

const renderNodesRecursively = (
    node: MindMapNodeData, 
    onSelectNode: (node: MindMapNodeData) => void
): React.ReactNode[] => {
    let nodes: React.ReactNode[] = [
        <MindMapNode 
            key={node.id} 
            node={node} 
            onSelectNode={onSelectNode} 
        />
    ];
    node.children.forEach(child => {
        nodes = nodes.concat(renderNodesRecursively(child, onSelectNode));
    });
    return nodes;
};

const MindMap: React.FC<{ data: MindMapNodeData; onSelectNode: (node: MindMapNodeData) => void; }> = ({ data, onSelectNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const targetX = data.x;
      const targetY = data.y;

      container.scrollLeft = targetX - (containerWidth / 2);
      container.scrollTop = targetY - (containerHeight / 3); 
    }
  }, [data.x, data.y]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-auto custom-scrollbar cursor-grab active:cursor-grabbing"
    >
      <div
        className="relative"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" className="stroke-gray-800/50" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <SvgConnections node={data} />
        </svg>
        {renderNodesRecursively(data, onSelectNode)}
      </div>
    </div>
  );
};


// --- From App.tsx ---
const App: React.FC = () => {
  const [mindMapData] = useState<MindMapNodeData>(INITIAL_MIND_MAP_DATA);
  const [selectedNodeContent, setSelectedNodeContent] = useState<StorySegment[] | null>(null);

  const handleSelectNode = useCallback((node: MindMapNodeData) => {
    if (node.content) {
      setSelectedNodeContent(node.content);
    }
  }, []);

  const handleCloseReader = useCallback(() => {
    setSelectedNodeContent(null);
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 text-white overflow-hidden flex flex-col font-sans">
      <header className="flex-shrink-0 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-cyan-400">
            KnowledgeCompass
          </h1>
          <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400 hidden md:block">An Interactive Business Journey</span>
          </div>
        </div>
      </header>

      <div className="text-center p-6 bg-gray-900/50 border-b border-gray-800 flex-shrink-0">
        <h2 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
          <span className="text-cyan-400">KnowledgeCompass</span>
        </h2>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-300">
          From a cluttered garage in Navi Mumbai to the boardrooms of a thriving company, Neil and Kanishq’s "KnowledgeCompass" journey blazes through the dramatic evolution from sole proprietorship, to partnership, and finally to a full-fledged corporation. Each transformation is powered by bold decisions and the real-world mastery of Business Studies, Accounting, and Economics, revealing how ambition and teamwork can turn a simple idea into an enterprise that shapes the future.
        </p>
      </div>

      <main className="flex-grow relative">
        <MindMap 
            data={mindMapData} 
            onSelectNode={handleSelectNode} 
        />
      </main>

      {selectedNodeContent && (
        <ContentReaderModal 
          content={selectedNodeContent} 
          onClose={handleCloseReader} 
        />
      )}

      <footer className="text-center p-2 bg-gray-900/80 text-xs text-gray-500 flex-shrink-0">
          <p>Created with passion for learning. Use the mind map to explore concepts.</p>
      </footer>
    </div>
  );
};


// --- Final render logic from original index.tsx ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
