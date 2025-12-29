"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import { Hash, Search, Plus, Smile, Paperclip, Send, Bell, Settings, User, LogIn, Sun, Moon, Languages } from "lucide-react";

const translations = {
    ja: {
        channels: "チャンネル",
        directMessages: "ダイレクトメッセージ",
        searchPlaceholder: "メッセージを検索...",
        composerPlaceholder: (name: string) => `#${name} にメッセージを送信`,
        welcome: (name: string) => `#${name} へようこそ`,
        welcomeDesc: (name: string) => `ここが #${name} チャンネルの始まりです。`,
        signIn: "ログイン",
        signOut: "ログアウト",
        loginHint: "メッセージを投稿するにはログインしてください。",
        magicLinkPrompt: "マジックリンクでのログインにメールアドレスを入力してください：",
        checkEmail: "ログインリンクをメールで確認してください！",
        settings: "設定",
        generalTopic: "社内の全体的なディスカッションと最新情報",
        selectChannel: "チャンネルを選択してください",
        uploading: "アップロード中...",
        file: "ファイル",
        addEmoji: "絵文字を追加",
        emojiName: "絵文字名",
    },
    en: {
        channels: "Channels",
        directMessages: "Direct Messages",
        searchPlaceholder: "Search message...",
        composerPlaceholder: (name: string) => `Message #${name}`,
        welcome: (name: string) => `Welcome to #${name}`,
        welcomeDesc: (name: string) => `This is the very beginning of the #${name} channel.`,
        signIn: "Sign In",
        signOut: "Sign Out",
        loginHint: "Please sign in to post a message.",
        magicLinkPrompt: "Enter your email for a Magic Link login:",
        checkEmail: "Check your email for the login link!",
        settings: "Settings",
        generalTopic: "Company-wide discussions and updates",
        selectChannel: "Select a channel",
        uploading: "Uploading...",
        file: "File",
        addEmoji: "Add Emoji",
        emojiName: "Emoji Name",
    }
};

interface Message {
    id: string;
    content: string;
    created_at: string;
    file_url?: string;
    file_type?: string;
    profiles?: {
        display_name: string;
        avatar_url: string;
    };
}

interface Channel {
    id: string;
    name: string;
}

interface CustomEmoji {
    name: string;
    image_url: string;
}

export default function Home() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [user, setUser] = useState<any>(null);
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [lang, setLang] = useState<"ja" | "en">("ja");
    const [isUploading, setIsUploading] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ url: string, type: string, name: string } | null>(null);
    const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiInputRef = useRef<HTMLInputElement>(null);

    const t = translations[lang];

    // 1. Initial Setup: Auth and Channels
    useEffect(() => {
        const setup = async () => {
            // Get current session
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            // Listen for auth changes
            supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null);
            });

            // Fetch channels
            const { data: channelsData } = await supabase
                .from("channels")
                .select("*")
                .order("name", { ascending: true });

            if (channelsData) {
                setChannels(channelsData);
                const general = channelsData.find(c => c.name === "general");
                if (general) setActiveChannel(general);
            }

            // Fetch Custom Emojis
            const { data: emojiData } = await supabase.from("custom_emojis").select("name, image_url");
            if (emojiData) setCustomEmojis(emojiData);

            // Load theme
            const savedTheme = localStorage.getItem("theme") as "dark" | "light";
            if (savedTheme) {
                setTheme(savedTheme);
                document.documentElement.setAttribute("data-theme", savedTheme);
            }

            // Load language
            const savedLang = localStorage.getItem("lang") as "ja" | "en";
            if (savedLang) {
                setLang(savedLang);
            }
        };

        setup();
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    };

    const toggleLang = () => {
        const newLang = lang === "ja" ? "en" : "ja";
        setLang(newLang);
        localStorage.setItem("lang", newLang);
    };

    const renderMessageContent = (content: string) => {
        if (!content) return null;

        // Simple regex to find :emoji_name:
        const parts = content.split(/(:[a-z0-9_-]+:)/gi);
        return parts.map((part, i) => {
            if (part.startsWith(":") && part.endsWith(":")) {
                const name = part.slice(1, -1);
                const emoji = customEmojis.find(e => e.name === name);
                if (emoji) {
                    return <img key={i} src={emoji.image_url} alt={name} className={styles.inlineEmoji} title={part} />;
                }
            }
            return part;
        });
    };

    // 2. Fetch Messages and Subscribe when Active Channel changes
    useEffect(() => {
        if (!activeChannel) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from("messages")
                .select(`
          *,
          profiles (
            display_name,
            avatar_url
          )
        `)
                .eq("channel_id", activeChannel.id)
                .order("created_at", { ascending: true });

            if (data) setMessages(data as any);
        };

        fetchMessages();

        // REALTIME SUBSCRIPTION
        const channel = supabase
            .channel(`public:messages:channel_id=eq.${activeChannel.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `channel_id=eq.${activeChannel.id}`,
                },
                async (payload) => {
                    // Fetch the full message with profile when a new one arrives
                    const { data } = await supabase
                        .from("messages")
                        .select(`*, profiles(display_name, avatar_url)`)
                        .eq("id", payload.new.id)
                        .single();

                    if (data) {
                        setMessages((prev) => [...prev, data as any]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChannel]);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        if (e) e.preventDefault();

        const fileData = pendingFile;
        if ((!newMessage.trim() && !fileData) || !activeChannel || !user) return;

        const content = newMessage;
        setNewMessage(""); // Clear early for better UX
        setPendingFile(null); // Clear pending file

        const { error } = await supabase.from("messages").insert({
            content: content || (fileData ? `[${t.file}]` : ""),
            channel_id: activeChannel.id,
            user_id: user.id,
            file_url: fileData?.url,
            file_type: fileData?.type
        });

        if (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message. Are you logged in?");
            // Restore content on error
            setNewMessage(content);
            setPendingFile(fileData);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !activeChannel) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('message-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('message-attachments')
                .getPublicUrl(filePath);

            setPendingFile({
                url: publicUrl,
                type: file.type,
                name: file.name
            });

        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleEmojiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const name = window.prompt(t.emojiName);
        if (!name) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${name}-${Math.random()}.${fileExt}`;
            const filePath = `emojis/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('custom-emojis')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('custom-emojis')
                .getPublicUrl(filePath);

            const { error: dbError } = await supabase.from("custom_emojis").insert({
                name: name.toLowerCase(),
                image_url: publicUrl,
                created_by: user.id
            });

            if (dbError) throw dbError;

            setCustomEmojis(prev => [...prev, { name: name.toLowerCase(), image_url: publicUrl }]);
            setShowEmojiPicker(false);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsUploading(false);
            if (emojiInputRef.current) emojiInputRef.current.value = "";
        }
    };

    const handleLogin = async () => {
        const email = window.prompt(t.magicLinkPrompt);
        if (email) {
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) alert(error.message);
            else alert(t.checkEmail);
        }
    };

    return (
        <main className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2 className="brand">Pulse</h2>
                    <div className={styles.headerButtons}>
                        <button onClick={toggleLang} className={styles.langToggle}>
                            <Languages size={18} />
                            <span>{lang === "ja" ? "JP" : "EN"}</span>
                        </button>
                        <button onClick={toggleTheme} className={styles.iconButton}>
                            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                </div>

                <div className={styles.scrollArea}>
                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <span>{t.channels}</span>
                            <Plus size={16} />
                        </div>
                        <ul className={styles.list}>
                            {channels.map((chan) => (
                                <li
                                    key={chan.id}
                                    className={activeChannel?.id === chan.id ? styles.listItemActive : styles.listItem}
                                    onClick={() => setActiveChannel(chan)}
                                >
                                    <Hash size={18} /> {chan.name}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <span>{t.directMessages}</span>
                            <Plus size={16} />
                        </div>
                        <ul className={styles.list}>
                            <li className={styles.listItem}><div className={styles.statusDot} /> Alex Rivers</li>
                            <li className={styles.listItem}><div className={styles.statusDot} /> Sarah Chen</li>
                        </ul>
                    </section>
                </div>

                <div className={styles.sidebarFooter}>
                    {user ? (
                        <div className={styles.userProfile}>
                            <div className={styles.avatar}>{user.email?.substring(0, 2).toUpperCase()}</div>
                            <span>{user.email?.split("@")[0]}</span>
                        </div>
                    ) : (
                        <button onClick={handleLogin} className={styles.loginBtn}>
                            <LogIn size={18} /> {t.signIn}
                        </button>
                    )}
                    <Settings size={18} className={styles.iconButton} />
                </div>
            </aside>

            {/* Main Chat Area */}
            <section className={styles.chatArea}>
                <header className={styles.chatHeader}>
                    <div className={styles.channelInfo}>
                        <Hash size={20} />
                        <h3>{activeChannel?.name || t.selectChannel}</h3>
                        {activeChannel?.name === "general" && (
                            <span className={styles.topic}>{t.generalTopic}</span>
                        )}
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.searchBar}>
                            <Search size={16} />
                            <input type="text" placeholder={t.searchPlaceholder} />
                        </div>
                        <User size={20} className={styles.iconButton} />
                    </div>
                </header>

                <div className={styles.messageList}>
                    {!messages.length && activeChannel && (
                        <div className={styles.welcomeHero}>
                            <div className={styles.hashIcon}><Hash size={40} /></div>
                            <h1>{t.welcome(activeChannel.name)}</h1>
                            <p>{t.welcomeDesc(activeChannel.name)}</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={styles.messageGroup}>
                            <div className={styles.messageAvatar}>
                                {msg.profiles?.display_name?.substring(0, 2).toUpperCase() || "U"}
                            </div>
                            <div className={styles.messageContent}>
                                <div className={styles.messageMeta}>
                                    <strong>{msg.profiles?.display_name || "Anonymous"}</strong>
                                    <span className={styles.timestamp}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                {msg.content && msg.content !== `[${translations.en.file}]` && msg.content !== `[${translations.ja.file}]` && (
                                    <p>{renderMessageContent(msg.content)}</p>
                                )}
                                {msg.file_url && (
                                    <div className={styles.attachment}>
                                        {msg.file_type?.startsWith("image/") ? (
                                            <img src={msg.file_url} alt="Attachment" className={styles.attachedImage} />
                                        ) : (
                                            <a href={msg.file_url} target="_blank" rel="noreferrer" className={styles.fileLink}>
                                                <Paperclip size={16} /> {t.file}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className={styles.composerArea}>
                    <form className={styles.composerContainer} onSubmit={handleSendMessage}>
                        {pendingFile && (
                            <div className={styles.previewContainer}>
                                {pendingFile.type.startsWith("image/") ? (
                                    <img src={pendingFile.url} alt="Preview" className={styles.previewImage} />
                                ) : (
                                    <div className={styles.filePreview}>
                                        <Paperclip size={18} />
                                        <span>{pendingFile.name}</span>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className={styles.removePreview}
                                    onClick={() => setPendingFile(null)}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        <div className={styles.inputWrapper}>
                            <div className={styles.composerToolbar}>
                                <div className={styles.emojiPickerWrapper}>
                                    <button
                                        type="button"
                                        className={styles.toolbarButton}
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    >
                                        <Smile size={20} />
                                    </button>

                                    {showEmojiPicker && (
                                        <div className={styles.emojiPicker}>
                                            <div className={styles.emojiGrid}>
                                                {customEmojis.map(emoji => (
                                                    <div
                                                        key={emoji.name}
                                                        className={styles.emojiItem}
                                                        onClick={() => {
                                                            setNewMessage(prev => prev + `:${emoji.name}:`);
                                                            setShowEmojiPicker(false);
                                                        }}
                                                    >
                                                        <img src={emoji.image_url} alt={emoji.name} />
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    className={styles.addEmojiBtn}
                                                    onClick={() => emojiInputRef.current?.click()}
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                            <input
                                                type="file"
                                                ref={emojiInputRef}
                                                style={{ display: 'none' }}
                                                onChange={handleEmojiUpload}
                                                accept="image/*"
                                            />
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className={styles.toolbarButton}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    <Paperclip size={20} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder={isUploading ? t.uploading : t.composerPlaceholder(activeChannel?.name || "...")}
                                className={styles.composerInput}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                disabled={!user || isUploading}
                            />
                            <button type="submit" className={styles.sendButton} disabled={!user || isUploading}>
                                <Send size={20} />
                            </button>
                        </div>
                    </form>
                    {!user && (
                        <p className={styles.loginHint}>{t.loginHint}</p>
                    )}
                </div>
            </section>
        </main>
    );
}
