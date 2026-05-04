import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { XCircle, ChevronUp, X } from 'lucide-react';
import axios from 'axios';
import { Navbar, Category } from './components/Navbar';
import { EraGrid } from './components/EraGrid';
import { EraDetail, findMvsForSong, findRemixesForSong, findSamplesForSong } from './components/EraDetail';
import { PlayerBar } from './components/PlayerBar';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { ArtGallery, ArtEntry } from './components/ArtGallery';
import { StemsView, StemEntry } from './components/StemsView';
import { MiscView, MiscEntry } from './components/MiscView';
import { TracklistsView, TracklistAlbum } from './components/TracklistsView';
import { QueueModal } from './components/QueueModal';
import { handleShareSilent } from './components/EraDetail';

import { TrackerData, Era, Song, SearchFilters } from './types';
import { matchesFilters, createSlug, getSongSlug, getCleanSongNameWithTags, isSongNotAvailable, formatTextForNotification, CUSTOM_IMAGES, HIDDEN_ALBUMS, handleDownloadFile } from './utils';
import { isLastfmLoggedIn, saveLastfmSession, clearLastfmSession, scrobbleTrack, updateNowPlaying, cleanTrackName, parseArtistFromSong, cleanAlbumName } from './lastfm';

const CUSTOM_ALBUM_INFO: Record<string, string[]> = {
  "The College Dropout": ["1 OG File(s)", "49 Full", "9 Tagged", "2 Partial", "7 Snippet(s)", "0 Stem Bounce(s)", "46 Unavailable"],
  "The Life Of Pablo": ["51 OG File(s)", "23 Full", "3 Tagged", "7 Partial", "19 Snippet(s)", "2 Stem Bounce(s)", "35 Unavailable"],
  "Turbo Grafix 16": ["20 OG File(s)", "11 Full", "0 Tagged", "0 Partial", "6 Snippet(s)", "2 Stem Bounce(s)", "50 Unavailable"],
  "The Elementary School Dropout": ["0 OG File(s)", "0 Full", "0 Tagged", "0 Partial", "3 Snippet(s)", "0 Stem Bounce(s)", "15 Unavailable"],
  "Wolves": ["1 OG File(s)", "4 Full", "0 Tagged", "1 Partial", "0 Snippet(s)", "0 Stem Bounce(s)", "12 Unavailable"]
};

export interface MvEntry {
  Era: string;
  Name: string;
  Notes: string;
  Length: string;
  Type: string;
  "Available Length": string;
  Quality: string;
  "Link(s)": string;
}

export interface RemixEntry {
  Era: string;
  Name: string;
  Notes: string;
  "Artist(s)": string;
  "Available Length": string;
  Quality: string;
  "Link(s)": string;
}

export interface SampleEntry {
  Era?: string;
  Name?: string;
  "Song Name\n(Special thanks to Isak & Jeen for their invaluable help on this page)"?: string;
  "Sample\n(Artist - Track)"?: string;
  Notes?: string;
  "Link(s)"?: string;
}

export interface FakesEntry {
  Era: string;
  Name: string;
  Notes?: string;
  "Made By"?: string;
  Type?: string;
  FeatureExtra?: string;
  "Available Length"?: string;
  "Link(s)"?: string;
}

import { SettingsView } from './components/SettingsView';
import { HistoryView } from './components/HistoryView';
import { FakesView } from './components/FakesView';
import { useSettings } from './SettingsContext';
import { recordListeningHistory } from './history';

const ERA_MAPPINGS: Record<string, string> = {
  "Turbo Grafx 16": "Turbo Grafix 16",
  "Turbo Grafx-16": "Turbo Grafix 16",
  "Donda [V1]": "DONDA [V1]",
  "Kids See Ghosts": "KIDS SEE GHOSTS",
  "KIDS SEE GHOSTS": "KIDS SEE GHOSTS",
  "KIDS SEE GHOST": "KIDS SEE GHOSTS",
  "Bully": "BULLY [V1]",
  "BULLY": "BULLY [V1]"
};

export default function App() {
  const { settings } = useSettings();
  const [data, setData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showSafariWarning, setShowSafariWarning] = useState(false);
  const [mvData, setMvData] = useState<MvEntry[]>([]);
  const [remixData, setRemixData] = useState<RemixEntry[]>([]);
  const [samplesData, setSamplesData] = useState<SampleEntry[]>([]);
  const [artData, setArtData] = useState<ArtEntry[]>([]);
  const [recentData, setRecentData] = useState<Song[]>([]);
  const [stemsData, setStemsData] = useState<StemEntry[]>([]);
  const [miscData, setMiscData] = useState<MiscEntry[]>([]);
  const [fakesData, setFakesData] = useState<FakesEntry[]>([]);
  const [tracklistsData, setTracklistsData] = useState<TracklistAlbum[]>([]);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [popupUrl, setPopupUrl] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [activeCategory, setActiveCategory] = useState<Category>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/art')) return 'art';
    if (path.startsWith('/stems')) return 'stems';
    if (path.startsWith('/misc')) return 'misc';
    if (path.startsWith('/fakes')) return 'fakes';
    if (path.startsWith('/related')) return 'related';
    if (path.startsWith('/recent')) return 'recent';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/history')) return 'history';
    if (path.startsWith('/tracklists')) return 'tracklists';
    return 'music';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    tags: [],
    excludedTags: [],
    qualities: [],
    excludedQualities: [],
    availableLengths: [],
    excludedAvailableLengths: [],
    durationOp: '>',
    durationValue: '',
    playableOnly: false,
    hasClips: null,
    hasRemixes: null,
    hasSamples: null
  });

  useEffect(() => {
    setFilters({
      tags: [],
      excludedTags: [],
      qualities: [],
      excludedQualities: [],
      availableLengths: [],
      excludedAvailableLengths: [],
      durationOp: '>',
      durationValue: '',
      playableOnly: false,
      hasClips: null,
      hasRemixes: null,
      hasSamples: null
    });
  }, [activeCategory]);

  const [selectedAlbum, setSelectedAlbum] = useState<Era | null>(null);

  const [currentEra, setCurrentEra] = useState<Era | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPlayerClosed, setIsPlayerClosed] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLastfmErrorModal, setShowLastfmErrorModal] = useState(false);

  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(settings.startupShuffle);
  const [shuffledQueue, setShuffledQueue] = useState<number[]>([]);
  const [loopMode, setLoopMode] = useState(settings.startupLoop || 0);
  const [hasLoopedOnce, setHasLoopedOnce] = useState(false);

  const [favoriteKeys, setFavoriteKeys] = useState<{ songName: string, eraName: string, url: string, song?: Song }[]>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('yzygold_favorite_keys');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('yzygold_favorite_keys', JSON.stringify(favoriteKeys));
    }
  }, [favoriteKeys]);

  const [showDiscordModal, setShowDiscordModal] = useState(false);

  useEffect(() => {
    const handleShowDiscord = () => setShowDiscordModal(true);
    window.addEventListener('show-discord-rpc-modal', handleShowDiscord);
    return () => window.removeEventListener('show-discord-rpc-modal', handleShowDiscord);
  }, []);

  const toggleFavorite = (song: Song, eraName: string) => {
    const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
    const cleanSong = { ...song };
    delete cleanSong.realEra;
    
    setFavoriteKeys(prev => {
      const exists = prev.some(k => k.songName === song.name && k.url === rawUrl);
      if (exists) {
        return prev.filter(k => !(k.songName === song.name && k.url === rawUrl));
      } else {
        return [...prev, { songName: song.name, eraName: eraName, url: rawUrl, song: cleanSong }];
      }
    });
  };

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    if (settings.startVolume !== null && settings.startVolume !== undefined) {
      return settings.startVolume / 100;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('yzygold_playback_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1) {
            return parsed.volume;
          }
        }
      } catch (e) {}
    }
    return 1;
  });

  const timeToRestoreRef = useRef<number | null>(null);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (settings.globalFontSize === 'small') {
      document.documentElement.style.fontSize = '14px';
    } else if (settings.globalFontSize === 'large') {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }
  }, [settings.globalFontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-color', settings.themeColor);
  }, [settings.themeColor]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && currentSong && currentEra) {
      const stateToSave = {
        song: { name: currentSong.name, url: currentSong.url || (currentSong.urls && currentSong.urls[0]) || '' },
        eraName: currentEra.name,
        volume: volume,
        currentTime: currentTime
      };
      localStorage.setItem('yzygold_playback_state', JSON.stringify(stateToSave));
    }
  }, [currentSong, currentEra, volume, currentTime]);

  useEffect(() => {
    if (data && recentData.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('yzygold_playback_state');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const savedSong = parsed.song;
            const savedEraName = parsed.eraName;

            if (savedSong && savedEraName) {
              const erasValues = Object.values(data.eras || {}) as Era[];
              let eraToRestore: Era | null = erasValues.find(e => e.name === savedEraName) || null;

              if (!eraToRestore && savedEraName === 'Recent Leaks') {
                eraToRestore = {
                  name: "Recent Leaks",
                  image: "https://i.ibb.co/7xRv4H2r/sdffsdsdf.png",
                  data: {
                    "Latest Additions": recentData.map(song => {
                      const eraName = song.extra2 || song.extra;
                      const realEra = erasValues.find(e => e.name === eraName);
                      return {
                        ...song,
                        image: CUSTOM_IMAGES[realEra?.name || ''] || realEra?.image,
                        realEra
                      };
                    })
                  }
                };
              }

              if (eraToRestore) {
                const allSongs = Object.values(eraToRestore.data || {}).flat();
                const songToRestore = allSongs.find((s: any) => s.name === savedSong.name && (s.url || (s.urls && s.urls[0]) || '') === savedSong.url);
                if (songToRestore) {
                  timeToRestoreRef.current = parsed.currentTime || 0;
                  handlePlaySong(songToRestore as Song, eraToRestore as Era, undefined, false, false);
                }
              } else if (savedEraName === 'Favorites') {
                const savedFavs = localStorage.getItem('yzygold_favorite_keys');
                if (savedFavs) {
                   const favKeys = JSON.parse(savedFavs);
                   const favEra = {
                      name: "Favorites",
                      image: "https://i.ibb.co/JFnmJ8rX/image.png",
                      data: {
                        "Favorite Tracks": favKeys.map((k: any) => {
                          let realEra = erasValues.find(e => e.name === k.eraName);
                          if (!realEra && k.eraName === 'Recent Leaks') {
                              realEra = { name: "Recent Leaks", image: "https://i.ibb.co/7xRv4H2r/sdffsdsdf.png", data: { "Latest Additions": recentData } };
                          }
                          let foundSong: Song | null = null;
                          if (realEra && realEra.data) {
                             const allC = Object.values(realEra.data).flat();
                             foundSong = allC.find((s: any) => s.name === k.songName && (s.url || (s.urls && s.urls[0] || '')) === k.url) as Song;
                          }
                          if (!foundSong && k.eraName === 'Recent Leaks') {
                             foundSong = recentData.find(s => s.name === k.songName && (s.url || (s.urls && s.urls[0] || '')) === k.url) as Song;
                          }
                          if (foundSong && realEra) {
                             const actualRealEra = (realEra.name === 'Recent Leaks' ? Object.values(data?.eras || {}).find((e: any) => e.name === foundSong!.extra) : realEra) as Era;
                             const rawEraName = foundSong.extra2 || foundSong.extra;
                             const cleanEraName = rawEraName ? getCleanSongNameWithTags(rawEraName) : '';
                             const actualRealEraNameSearch = actualRealEra?.name || '';
                             return { ...foundSong, realEra: actualRealEra, image: CUSTOM_IMAGES[rawEraName || ''] || CUSTOM_IMAGES[cleanEraName || ''] || CUSTOM_IMAGES[actualRealEraNameSearch || ''] || actualRealEra?.image || foundSong.image };
                          }
                          return null;
                        }).filter((s: any) => s !== null)
                      }
                   };
                   const s = Object.values(favEra.data)[0].find((s: any) => s.name === savedSong.name && (s.url || (s.urls && s.urls[0]) || '') === savedSong.url);
                   if (s) {
                     timeToRestoreRef.current = parsed.currentTime || 0;
                     handlePlaySong(s as Song, favEra as Era, undefined, false, false);
                   }
                }
              }
            }
          } catch(e) {}
        }
      }
    }
  }, [data, recentData]);

  const [lastfmLoggedIn, setLastfmLoggedIn] = useState(isLastfmLoggedIn());
  const scrobbledRef = useRef(false);
  const songStartTimeRef = useRef<number>(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const initAudio = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (!audioContextRef.current && audioRef.current && !isIOS) {
        const windowAny = window as any;
        const AudioContext = window.AudioContext || windowAny.webkitAudioContext;
        if (!AudioContext) return;

        try {
          const ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;

          const source = ctx.createMediaElementSource(audioRef.current);
          source.connect(analyser);
          analyser.connect(ctx.destination);

          audioContextRef.current = ctx;
          analyserRef.current = analyser;
        } catch (e) {
          console.error("Failed to initialize AudioContext", e);
        }
      }
    };

    document.addEventListener('click', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
    };
  }, []);

  function applyLocalSongs(targetJson: any, localData: any) {
    if (!Array.isArray(localData)) return;
    localData.forEach((item: any) => {
      const originalEraName = item.Era;
      if (!originalEraName) return;
      const matchedMapKey = Object.keys(ERA_MAPPINGS).find(k => k.toLowerCase() === originalEraName.toLowerCase());
      const eraName = matchedMapKey ? ERA_MAPPINGS[matchedMapKey] : originalEraName;
      if (!targetJson.eras?.[eraName]) return;

      let rawUrl = item['Link(s)'] || '';
      const linkMatch = rawUrl.match(/\]\((.*?)\)/);
      if (linkMatch?.[1]) rawUrl = linkMatch[1];

      const newSong: Song = {
        name: item.Name,
        extra: item.extra || item.Extra || undefined,
        description: item.Notes || '',
        track_length: item['Track Length'] || '',
        leak_date: item['Leak Date'] || '',
        file_date: item['File Date'] || '',
        available_length: item['Available Length'] || '',
        quality: item.Quality || '',
        url: rawUrl,
        urls: [rawUrl]
      };

      const categories = targetJson.eras[eraName].data || {};
      const belowName = (item.Below || '').trim();
      const targetCategory = item.Category;

      // Try to insert below a specific song
      if (belowName) {
        for (const cat of Object.keys(categories)) {
          const list = categories[cat] as Song[];
          const idx = list.findIndex(s => s.name?.trim() === belowName || s.name?.includes(belowName));
          if (idx !== -1) {
            list.splice(idx + 1, 0, newSong);
            return;
          }
        }
      }

      // No Below match — append to target category or first available category
      const catKey = targetCategory && categories[targetCategory]
        ? targetCategory
        : Object.keys(categories)[0];
      if (catKey) {
        if (!categories[catKey]) categories[catKey] = [];
        (categories[catKey] as Song[]).push(newSong);
      }
    });
  }

  useEffect(() => {
    Promise.all([
      axios.get('https://yzygold-api.vercel.app/api/a'),
      axios.get('https://yzygold-test.vercel.app/MyK.json').catch(err => {
        console.error("Failed to fetch MyK data", err);
        return { data: [] };
      }),
      axios.get('/local-songs.json').catch(err => {
        console.error("Failed to fetch local songs", err);
        return { data: [] };
      })
    ])
      .then(([mainRes, mykRes, localRes]) => {
        const rawJson = mainRes.data;
        const json = JSON.parse(JSON.stringify(rawJson));

        const categoriesToNormalize = ['eras', 'art', 'misc', 'stems', 'fakes', 'reference_track'];
        categoriesToNormalize.forEach(category => {
          if (json[category]) {
            Object.keys(json[category]).forEach(key => {
              const matchedMapKey = Object.keys(ERA_MAPPINGS).find(k => k.toLowerCase() === key.toLowerCase());
              const mappedKey = matchedMapKey ? ERA_MAPPINGS[matchedMapKey] : undefined;

              if (mappedKey && mappedKey !== key) {
                if (!json[category][mappedKey]) {
                  json[category][mappedKey] = json[category][key];
                } else {
                  if (Array.isArray(json[category][mappedKey])) {
                    json[category][mappedKey] = json[category][mappedKey].concat(json[category][key]);
                  } else {
                    const existing = json[category][mappedKey];
                    const incoming = json[category][key];
                    json[category][mappedKey] = { 
                      ...existing, 
                      ...incoming,
                      image: existing.image || incoming.image,
                      extra: existing.extra || incoming.extra,
                      data: {
                        ...existing.data,
                        ...incoming.data
                      }
                    };
                  }
                }
                if (category === 'eras' && json[category][mappedKey]) {
                  json[category][mappedKey].name = mappedKey;
                }
                delete json[category][key];
              }
            });
          }
        });

        const mykData = mykRes.data;

        if (Array.isArray(mykData)) {
          const nextJson = JSON.parse(JSON.stringify(json));
          
          if (!nextJson.eras["Wolves"]) {
            nextJson.eras["Wolves"] = {
              name: "Wolves",
              image: "https://i.ibb.co/ydSS4sG/Wolves.png",
              extra: "(Collaboration with Drake) (New Abu Dhabi, Calabasas Is The New Abu Dhabi)",
              data: {
                "Main Tracks": [],
                "Snippets & Leaks": []
              }
            };
          }

          mykData.forEach((mykItem: any) => {
            const originalEraName = mykItem.Era;
            const matchedMapKey = Object.keys(ERA_MAPPINGS).find(k => k.toLowerCase() === originalEraName?.toLowerCase());
            const eraName = matchedMapKey ? ERA_MAPPINGS[matchedMapKey] : originalEraName;
            
            if (nextJson.eras && nextJson.eras[eraName]) {
              const belowName = (mykItem.Below || "").trim();
              const categories = nextJson.eras[eraName].data || {};
              let matched = false;

              let rawUrl = mykItem['Link(s)'] || '';
              const linkMatch = rawUrl.match(/\]\((.*?)\)/);
              if (linkMatch && linkMatch[1]) {
                rawUrl = linkMatch[1];
              } else if (rawUrl.startsWith('[') && rawUrl.endsWith(')')) {
                 const parts = rawUrl.split('](');
                 if (parts.length === 2) {
                    rawUrl = parts[1].replace(')', '');
                 }
              }

              const newSong: Song = {
                name: mykItem.Name,
                extra: mykItem.extra || mykItem.Extra || undefined,
                description: mykItem.Notes || '',
                track_length: mykItem['Track Length'] || '',
                leak_date: mykItem['Leak Date'] || '',
                file_date: mykItem['File Date'] || '',
                available_length: mykItem['Available Length'] || '',
                quality: mykItem.Quality || '',
                url: rawUrl,
                urls: [rawUrl]
              };

              for (const category of Object.keys(categories)) {
                const songList = categories[category] as Song[];
                const belowIndex = songList.findIndex(s => 
                  s.name?.trim() === belowName || s.name?.includes(belowName)
                );
                
                if (belowIndex !== -1) {
                  if (mykItem.Change) {
                    if (belowIndex + 1 < songList.length) {
                      songList[belowIndex + 1] = newSong;
                    } else {
                      songList.push(newSong);
                    }
                  } else {
                    songList.splice(belowIndex + 1, 0, newSong);
                  }
                  matched = true;
                  break;
                }
              }

              if (!matched && eraName === "Wolves") {
                if (!categories["Main Tracks"]) {
                  categories["Main Tracks"] = [];
                }
                categories["Main Tracks"].push(newSong);
              }
            }
          });
          applyLocalSongs(nextJson, localRes.data);
          setData(nextJson);
        } else {
          const baseJson = JSON.parse(JSON.stringify(json));
          applyLocalSongs(baseJson, localRes.data);
          setData(baseJson);
        }
        setLoading(false);

        const path = window.location.pathname;
        const hash = window.location.hash;
        if (path.startsWith('/art') || hash.startsWith('#art')) {
          setActiveCategory('art');
        } else if (path.startsWith('/stems')) {
          setActiveCategory('stems');
        } else if (path.startsWith('/misc')) {
          setActiveCategory('misc');
        } else if (path.startsWith('/fakes')) {
          setActiveCategory('fakes');
        } else if (path.startsWith('/recent')) {
          setActiveCategory('recent');
        } else if (path.startsWith('/settings')) {
          setActiveCategory('settings');
        } else if (path.startsWith('/history')) {
          setActiveCategory('history');
        } else if (path.startsWith('/tracklists/')) {
          setActiveCategory('tracklists');
          const slug = path.split('/tracklists/')[1];
          const erasValues = Object.values(json.eras || {}) as Era[];
          const match = erasValues.find(e => createSlug(e.name) === slug);
          if (match) {
            setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          } else {
            window.history.replaceState({ category: 'tracklists' }, '', '/tracklists');
          }
        } else if (path.startsWith('/tracklists')) {
          setActiveCategory('tracklists');
        } else if (path.startsWith('/related/')) {
          setActiveCategory('related');
          const slug = path.split('/related/')[1];
          const erasValues = Object.values(json.eras || {}) as Era[];
          const match = erasValues.find(e => createSlug(e.name) === slug);
          if (match) {
            setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          } else {
            window.history.replaceState({ category: 'related' }, '', '/related');
          }
        } else if (path.startsWith('/album/')) {
          const slug = path.split('/album/')[1];
          if (slug === 'nasir' || slug === 'ktse' || slug === 'never stop' || slug === 'daytona' || slug === 'the elementary school dropout') {
            window.history.replaceState({ album: null }, '', '/');
            return;
          }
          const erasValues = Object.values(json.eras || {}) as Era[];
          const match = erasValues.find(e => createSlug(e.name) === slug);
          if (match) {
            setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          }
        }
      })
      .catch(err => {
        console.error("Failed to fetch tracker data:", err);
        setLoading(false);
      });

    const normalizeEraField = (dataArray: any[]) => {
      return dataArray.map(item => {
        if (item.Era) {
          const matchedMapKey = Object.keys(ERA_MAPPINGS).find(k => k.toLowerCase() === item.Era.toLowerCase());
          if (matchedMapKey) {
            return { ...item, Era: ERA_MAPPINGS[matchedMapKey] };
          }
        }
        return item;
      });
    };

    axios.get('https://yzygold-test.vercel.app/MV.json')
      .then(res => {
        setMvData(normalizeEraField(res.data) as MvEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch MV data:", err);
      });

    axios.get('https://yzygold-test.vercel.app/Remixes.json')
      .then(res => {
        setRemixData(normalizeEraField(res.data) as RemixEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch Remix data:", err);
      });

    axios.get('/api/art')
      .then(res => {
        const data = normalizeEraField(res.data) as ArtEntry[];
        const filteredData = data.filter(item => {
          const l = (item['Link(s)'] || '').toLowerCase();
          return !l.includes('link needed') && !l.includes('link%20needed') && !l.includes('source needed') && !l.includes('source%20needed');
        });
        setArtData(filteredData);
      })
      .catch(err => {
        console.error("Failed to fetch Art data:", err);
      });

    axios.get('https://yzygold-test.vercel.app/Stems.json')
      .then(res => {
        setStemsData(normalizeEraField(res.data) as StemEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch Stems data:", err);
      });

    axios.get('/api/misc')
      .then(res => {
        setMiscData(normalizeEraField(res.data) as MiscEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch Misc data:", err);
      });

    axios.get('https://yzygold-test.vercel.app/Fakes.json')
      .then(res => {
        const rawFakes = normalizeEraField(res.data) as any[];
        const mappedFakes = rawFakes.map(item => {
          let name = item.Name || '';
          let featureExtra = undefined;

          if (name) {
            const match = name.match(/\s*\(/);
            if (match) {
                const idx = match.index;
                const lastIdx = name.lastIndexOf(')');
                if (lastIdx > idx) {
                    featureExtra = name.substring(idx, lastIdx + 1).trim();
                    const remainder = name.substring(lastIdx + 1).trim();
                    name = name.substring(0, idx).trim() + (remainder ? " " + remainder : "");
                } else {
                    featureExtra = name.substring(idx).trim();
                    name = name.substring(0, idx).trim();
                }
            }
          }

          const newItem = { ...item, Name: name, FeatureExtra: featureExtra };
          const notesKey = Object.keys(item).find(k => k.startsWith('Notes'));
          if (notesKey && notesKey !== 'Notes') {
            newItem.Notes = item[notesKey];
          }
          return newItem;
        });
        setFakesData(mappedFakes as FakesEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch Fakes data:", err);
      });

    axios.get('https://yzygold-test.vercel.app/Samples.json')
      .then(res => {
        setSamplesData(res.data as SampleEntry[]);
      })
      .catch(err => {
        console.error("Failed to fetch Samples data:", err);
      });

    axios.get('/Tracklists.json')
      .then(res => {
        setTracklistsData(res.data as TracklistAlbum[]);
      })
      .catch(err => {
        console.error("Failed to fetch Tracklists data:", err);
      });

    axios.get('/api/recent')
      .then(res => {
        const mapped = res.data.map((item: any) => {
          let name = item.Name || '';
          let extra = undefined;
          let extra2 = item.Era || undefined;
          
          if (extra2) {
            const match = extra2.match(/\s*\(/);
            if (match) {
                const idx = match.index;
                const extractedExtra = extra2.substring(idx).trim();
                extra2 = extra2.substring(0, idx).trim();
                extra = extractedExtra;
            }
          }

          if (name) {
            const match = name.match(/\s*\(/);
            if (match) {
                const idx = match.index;
                const lastIdx = name.lastIndexOf(')');
                if (lastIdx > idx) {
                    const extractedExtra = name.substring(idx, lastIdx + 1).trim();
                    const remainder = name.substring(lastIdx + 1).trim();
                    name = name.substring(0, idx).trim() + (remainder ? " " + remainder : "");
                    if (extra) {
                       extra = extractedExtra + ' ' + extra;
                    } else {
                       extra = extractedExtra;
                    }
                } else {
                    const extractedExtra = name.substring(idx).trim();
                    name = name.substring(0, idx).trim();
                    if (extra) {
                       extra = extractedExtra + ' ' + extra;
                    } else {
                       extra = extractedExtra;
                    }
                }
            }
          }

          return {
            name,
            extra,
            extra2,
            description: item.Notes,
            track_length: item["Track Length"],
            leak_date: item["Leak\nDate"] || item["Leak Date"],
            file_date: item["File\nDate"] || item["File Date"],
            available_length: item["Available Length"],
            quality: item.Quality,
            url: item["Link(s)"] ? item["Link(s)"].split('\n')[0] : '',
            urls: item["Link(s)"] ? item["Link(s)"].split('\n') : []
          };
        });

        setRecentData(mapped);
      })
      .catch(err => {
        console.error("Failed to fetch Recent data:", err);
      });

    const userAgent = navigator.userAgent.toLowerCase();
    const isBrowserSafari = userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('crios') && !userAgent.includes('android');

    if (!localStorage.getItem('v1_5_ownership_seen')) {
      setShowChangelog(true);
    } else if (isBrowserSafari) {
      setShowSafariWarning(true);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const lastfmSession = urlParams.get('lastfm_session');
    const lastfmUser = urlParams.get('lastfm_user');
    if (lastfmSession && lastfmUser) {
      saveLastfmSession(lastfmSession, lastfmUser);
      setLastfmLoggedIn(true);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const handleLastfmApiError = () => {
      setShowLastfmErrorModal(true);
      clearLastfmSession();
      setLastfmLoggedIn(false);
    };

    window.addEventListener('lastfm-api-error', handleLastfmApiError);
    return () => {
      window.removeEventListener('lastfm-api-error', handleLastfmApiError);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const currentPath = window.location.pathname;

    if (activeCategory === 'art') {
      if (!currentPath.startsWith('/art')) {
        window.history.pushState({ category: 'art' }, '', '/art');
      }
    } else if (activeCategory === 'stems') {
      if (!currentPath.startsWith('/stems')) {
        window.history.pushState({ category: 'stems' }, '', '/stems');
      }
    } else if (activeCategory === 'misc') {
      if (!currentPath.startsWith('/misc')) {
        window.history.pushState({ category: 'misc' }, '', '/misc');
      }
    } else if (activeCategory === 'fakes') {
      if (!currentPath.startsWith('/fakes')) {
        window.history.pushState({ category: 'fakes' }, '', '/fakes');
      }
    } else if (activeCategory === 'recent') {
      if (!currentPath.startsWith('/recent')) {
        window.history.pushState({ category: 'recent' }, '', '/recent');
      }
    } else if (activeCategory === 'settings') {
      if (!currentPath.startsWith('/settings')) {
        window.history.pushState({ category: 'settings' }, '', '/settings');
      }
    } else if (activeCategory === 'history') {
      if (!currentPath.startsWith('/history')) {
        window.history.pushState({ category: 'history' }, '', '/history');
      }
    } else if (activeCategory === 'related') {
      if (selectedAlbum) {
        const newPath = `/related/${createSlug(selectedAlbum.name)}`;
        if (currentPath !== newPath && !currentPath.includes('?song=')) {
          window.history.pushState({ album: selectedAlbum.name, category: 'related' }, '', newPath);
        }
      } else {
        if (currentPath !== '/related') {
          window.history.pushState({ category: 'related' }, '', '/related');
        }
      }
    } else if (activeCategory === 'tracklists') {
      if (selectedAlbum) {
        const newPath = `/tracklists/${createSlug(selectedAlbum.name)}`;
        if (currentPath !== newPath && !currentPath.includes('?song=')) {
          window.history.pushState({ album: selectedAlbum.name, category: 'tracklists' }, '', newPath);
        }
      } else {
        if (currentPath !== '/tracklists') {
          window.history.pushState({ category: 'tracklists' }, '', '/tracklists');
        }
      }
    } else {
      if (selectedAlbum) {
        const newPath = `/album/${createSlug(selectedAlbum.name)}`;
        if (currentPath !== newPath && !currentPath.includes('?song=')) {
          window.history.pushState({ album: selectedAlbum.name }, '', newPath);
        }
      } else {
        if (currentPath !== '/') {
          window.history.pushState({ album: null }, '', '/');
        }
      }
    }
  }, [selectedAlbum, loading, activeCategory]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/') {
        setSelectedAlbum(null);
        setActiveCategory('music');
      } else if (path.startsWith('/album/') && data) {
        const slug = path.split('/album/')[1];
        const erasValues = Object.values(data.eras || {}) as Era[];
        const match = erasValues.find(e => createSlug(e.name) === slug);
        if (match) {
          setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          setActiveCategory('music');
        } else {
          setSelectedAlbum(null);
          setActiveCategory('music');
        }
      } else if (path.startsWith('/related/') && data) {
        const slug = path.split('/related/')[1];
        const erasValues = Object.values(data.eras || {}) as Era[];
        const match = erasValues.find(e => createSlug(e.name) === slug);
        if (match) {
          setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          setActiveCategory('related');
        } else {
          setSelectedAlbum(null);
          setActiveCategory('related');
        }
      } else if (path.startsWith('/related')) {
        setSelectedAlbum(null);
        setActiveCategory('related');
      } else if (path.startsWith('/tracklists/') && data) {
        const slug = path.split('/tracklists/')[1];
        const erasValues = Object.values(data.eras || {}) as Era[];
        const match = erasValues.find(e => createSlug(e.name) === slug);
        if (match) {
          setSelectedAlbum({ ...match, fileInfo: CUSTOM_ALBUM_INFO[match.name] || match.fileInfo, image: CUSTOM_IMAGES[match.name] || match.image });
          setActiveCategory('tracklists');
        } else {
          setSelectedAlbum(null);
          setActiveCategory('tracklists');
        }
      } else if (path.startsWith('/tracklists')) {
        setSelectedAlbum(null);
        setActiveCategory('tracklists');
      } else if (path.startsWith('/art')) {
        setActiveCategory('art');
      } else if (path.startsWith('/stems')) {
        setActiveCategory('stems');
      } else if (path.startsWith('/misc')) {
        setActiveCategory('misc');

      } else if (path.startsWith('/recent')) {
        setActiveCategory('recent');
      } else if (path.startsWith('/settings')) {
        setActiveCategory('settings');
      } else if (path.startsWith('/history')) {
        setActiveCategory('history');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [data]);

  const generateShuffledQueue = (length: number, firstIndex: number) => {
    if (length <= 0) return [];
    const queue = Array.from({ length }, (_, i) => i);
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    if (firstIndex >= 0 && firstIndex < length) {
      const startIdxPos = queue.indexOf(firstIndex);
      if (startIdxPos > -1) {
        queue.splice(startIdxPos, 1);
        queue.unshift(firstIndex);
      }
    }
    return queue;
  };

  const getPlayableSongs = (era: Era) => {
    return Object.values(era.data || {}).flat().filter(s => {
      const rawUrl = s.url || (s.urls && s.urls.length > 0 ? s.urls[0] : '');
      const isNotAvailable = isSongNotAvailable(s, rawUrl);
      return rawUrl && (rawUrl.includes('pillows.su/f/') || rawUrl.includes('temp.imgur.gg/f/')) && !isNotAvailable;
    });
  };

  const handlePlaySong = async (song: Song, era: Era, contextTracks?: Song[], resetShuffleHistory = true, autoPlay = true, isRandomSelection = false) => {
    const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
    const isNotAvailable = isSongNotAvailable(song, rawUrl);
    
    const lowerUrl = (rawUrl || '').toLowerCase();
    const isTrulyEmptyLink = !rawUrl || lowerUrl === 'n/a' || lowerUrl.includes('link needed') || lowerUrl.includes('source needed');

    if (isTrulyEmptyLink) return;

    if (isNotAvailable) {
       if (settings.notOpenInNewTab) {
           setPopupUrl(rawUrl);
       } else {
           window.open(rawUrl, '_blank');
       }
       return;
    }

    if (rawUrl.includes('pillows.su/f/') || rawUrl.includes('temp.imgur.gg/f/')) {
      let streamUrl = '';
      let isPlayable = true;

      try {
        if (rawUrl.includes('temp.imgur.gg/f/')) {
          const id = rawUrl.split('/f/')[1];
          const res = await axios.get(`https://temp.imgur.gg/api/file/${id}`);

          if (res.data && res.data.cdnUrl) {
            streamUrl = res.data.cdnUrl;
            const type = res.data.type || '';
            const isZip = type.includes('zip') || res.data.name.toLowerCase().endsWith('.zip');
            const isImg = type.includes('image') || res.data.name.toLowerCase().endsWith('.jpg') || res.data.name.toLowerCase().endsWith('.jpeg') || res.data.name.toLowerCase().endsWith('.png');
            if (isZip || isImg) {
              isPlayable = false;
            }
          }
        } else if (rawUrl.includes('pillows.su/f/')) {
          const id = rawUrl.split('/f/')[1];
          streamUrl = `https://api.pillows.su/api/get/${id}`;
        }

      } catch (err) {
        console.error("Failed to fetch file info:", err);
      }

      if (!isPlayable) {
        setIsPlaying(false);
        setIsPlayerClosed(true);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        showToast("Song cannot be played because it's not an audio file");
        return;
      }

      const playableSongs = contextTracks && contextTracks.length > 0 ? contextTracks : getPlayableSongs(era);
      setPlaylist(playableSongs);
      const newIndex = playableSongs.findIndex(s => s.name === song.name && (s.url || (s.urls && s.urls[0]) || '') === (song.url || (song.urls && song.urls[0]) || ''));
      setCurrentSongIndex(newIndex);
      if (resetShuffleHistory) {
         setShuffledQueue(generateShuffledQueue(playableSongs.length, newIndex));
         setIsRandomMode(isRandomSelection);
      }
      setHasLoopedOnce(false);

      setCurrentSong(song);
      setCurrentEra(era);
      setIsPlaying(autoPlay);
      setIsPlayerClosed(false);
      scrobbledRef.current = false;
      songStartTimeRef.current = Math.floor(Date.now() / 1000);

      if (audioRef.current) {
        const ua = navigator.userAgent.toLowerCase();
        const isSafari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('crios') && !ua.includes('android');

        if (audioBlobUrlRef.current) {
          URL.revokeObjectURL(audioBlobUrlRef.current);
          audioBlobUrlRef.current = null;
        }

        if (isSafari && streamUrl) {
          // Safari respects Content-Disposition: attachment even on audio src assignments,
          // triggering a file download instead of inline playback. Fetching as a blob and
          // using a blob: URL bypasses this header entirely since blob: URLs have no
          // HTTP response headers.
          try {
            const response = await fetch(streamUrl);
            if (response.ok) {
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              audioBlobUrlRef.current = blobUrl;
              audioRef.current.src = blobUrl;
            } else {
              audioRef.current.src = streamUrl;
            }
          } catch (err) {
            console.error("Safari audio blob fetch failed, falling back to direct URL:", err);
            audioRef.current.src = streamUrl;
          }
        } else {
          audioRef.current.src = streamUrl;
        }

        audioRef.current.volume = volume;
        if (autoPlay) {
          audioRef.current.play().catch(e => { if (e.name !== 'AbortError') console.error("Audio play failed", e) });
        }
      }

      const actualEraName = (song as any).realEra?.name || era.name;
      
    } else {
      if (settings.notOpenInNewTab) {
          setPopupUrl(rawUrl);
      } else {
          window.open(rawUrl, '_blank');
      }
    }
  };

  const lastRecordedSongRef = useRef<string>('');

  useEffect(() => {
    if (isPlaying && currentSong && currentEra && settings.saveListeningHistory) {
      const actualEraName = (currentSong as any).realEra?.name || currentEra.name;
      const cleanActualEraName = cleanAlbumName(actualEraName).replace(/ \[Fake\]$/i, '');
      const cleanRealTrackName = currentSong.name.replace(/ \[Fake\]$/i, '');
      const lfmArtist = parseArtistFromSong(cleanRealTrackName, currentSong.extra, actualEraName);
      const albumArt = (currentSong as any).realEra?.image || currentEra.image || '';
      
      const songKey = `${cleanRealTrackName}-${actualEraName}`;
      if (lastRecordedSongRef.current !== songKey) {
        lastRecordedSongRef.current = songKey;
        recordListeningHistory({...currentSong, name: cleanRealTrackName}, { ...currentEra, name: actualEraName }, lfmArtist, albumArt);
      }
    }
  }, [isPlaying, currentSong, currentEra, settings.saveListeningHistory]);

  useEffect(() => {
    if (lastfmLoggedIn && isPlaying && currentSong && currentEra) {
      const actualEraName = (currentSong as any).realEra?.name || currentEra.name;
      const cleanActualEraName = cleanAlbumName(actualEraName).replace(/ \[Fake\]$/i, '');
      const cleanRealTrackName = currentSong.name.replace(/ \[Fake\]$/i, '');
      const lfmArtist = parseArtistFromSong(cleanRealTrackName, currentSong.extra, actualEraName);
      
      const lfmTrack = cleanTrackName(cleanRealTrackName, currentSong.extra, settings.lastfmShowVersion, settings.lastfmShowTags, settings.lastfmShowFeats);
      updateNowPlaying(lfmTrack, lfmArtist, cleanActualEraName);
    }
  }, [isPlaying, currentSong, currentEra, lastfmLoggedIn, settings.lastfmShowVersion, settings.lastfmShowTags, settings.lastfmShowFeats]);

  useEffect(() => {
    if (selectedAlbum) {
      const searchParams = new URLSearchParams(window.location.search);
      const songName = searchParams.get('song');

      if (songName) {
        const allSongs = Object.values(selectedAlbum.data || {}).flat();
        const songToPlay = allSongs.find(s => getSongSlug(s, allSongs) === songName);

        if (songToPlay) {
          setTimeout(() => {
            handlePlaySong(songToPlay, selectedAlbum);
            window.history.replaceState({ album: selectedAlbum.name }, '', window.location.pathname);
          }, 0);
        }
      }
    }
  }, [selectedAlbum, currentSong]);

  const playNext = () => {
    if (playlist.length === 0 || !currentEra) return;
    let nextIndex = currentSongIndex + 1;
    if (isShuffle && shuffledQueue.length > 0) {
      const idx = shuffledQueue.indexOf(currentSongIndex);
      if (idx !== -1 && idx < shuffledQueue.length - 1) {
        nextIndex = shuffledQueue[idx + 1];
      } else {
        nextIndex = shuffledQueue[0];
      }
    } else if (nextIndex >= playlist.length) {
      nextIndex = 0;
    }

    const nextSong = playlist[nextIndex];
    if (nextSong) {
      const eraToPass = (nextSong as any).realEra || currentEra;
      handlePlaySong(nextSong, eraToPass, playlist, false, true, isRandomMode);
    }
  };

  const playPrev = () => {
    if (playlist.length === 0 || !currentEra) return;
    let prevIndex = currentSongIndex - 1;
    if (isShuffle && shuffledQueue.length > 0) {
      const idx = shuffledQueue.indexOf(currentSongIndex);
      if (idx > 0) {
        prevIndex = shuffledQueue[idx - 1];
      } else {
        prevIndex = shuffledQueue[shuffledQueue.length - 1];
      }
    } else if (prevIndex < 0) {
      prevIndex = playlist.length - 1;
    }

    const prevSong = playlist[prevIndex];
    if (prevSong) {
      const eraToPass = (prevSong as any).realEra || currentEra;
      handlePlaySong(prevSong, eraToPass, playlist, false, true, isRandomMode);
    }
  };

  const handleEnded = () => {

    if (loopMode === 2) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => { if (e.name !== 'AbortError') console.error("Audio play failed", e); });
        }
      }
    } else if (loopMode === 1) {
      if (!hasLoopedOnce) {
        setHasLoopedOnce(true);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => { if (e.name !== 'AbortError') console.error("Audio play failed", e); });
          }
        }
      } else {
        setHasLoopedOnce(false);
        playNext();
      }
    } else {
      playNext();
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(e => { if (e.name !== 'AbortError') console.error("Audio play failed", e) });
      setIsPlaying(true);
    }
  };

  const handlersRef = useRef({ playNext, playPrev, togglePlay });
  useEffect(() => {
    handlersRef.current = { playNext, playPrev, togglePlay };
  }, [playNext, playPrev, togglePlay]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentSong && currentEra) {
      const actualEraName = (currentSong as any).realEra?.name || currentEra.name;
      const cleanActualEraName = cleanAlbumName(actualEraName);
      const lfmTrack = cleanTrackName(currentSong.name, currentSong.extra);
      const coverImage = currentSong.image || CUSTOM_IMAGES[actualEraName] || currentEra.image || 'https://i.ibb.co/mrK8W4rL/image-2026-03-22-142639537.png';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: lfmTrack,
        artist: parseArtistFromSong(currentSong.name, currentSong.extra, actualEraName),
        album: cleanActualEraName,
        artwork: [
          { src: coverImage, sizes: '512x512', type: 'image/png' },
          { src: coverImage, sizes: '256x256', type: 'image/png' }
        ]
      });

      if (settings.discordRPC) {
        const rawSongUrl = currentSong.url || (currentSong.urls && currentSong.urls.length > 0 ? currentSong.urls[0] : '');
        const directLink = rawSongUrl.includes('pillows.su/f/') 
          ? `https://api.pillows.su/api/download/${rawSongUrl.split('/f/')[1]}`
          : rawSongUrl;
          
        let catForDiscord = 'Music';
        if (currentSong.name.endsWith('[Misc]') || actualEraName.includes('Misc')) {
          catForDiscord = 'Misc';
        } else if (currentSong.name.endsWith('[Stems]') || actualEraName.includes('Stems')) {
          catForDiscord = 'Stems';
        } else if (currentSong.name.endsWith('[Fake Leak]') || actualEraName.includes('Fake')) {
          catForDiscord = 'Fakes';
        } else if (activeCategory === 'recent') {
          catForDiscord = 'Recent';
        }

        console.log(`Song Name: ${lfmTrack}\nAlbum Name: ${cleanActualEraName}\nArtist Name: ${parseArtistFromSong(currentSong.name, currentSong.extra, actualEraName)}\nSong/Album Pic: ${coverImage}\nCategory: ${catForDiscord}`);
      }

      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (audioRef.current) {
            audioRef.current.play().catch(e => { if (e.name !== 'AbortError') console.error(e) });
            setIsPlaying(true);
          }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          handlersRef.current.playNext();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          handlersRef.current.playPrev();
        });
      } catch (error) {
        console.error("MediaSession error:", error);
      }
    }
  }, [currentSong, currentEra]);

  const toggleShuffleState = () => {
    setIsShuffle(prev => {
      const next = !prev;
      if (next && playlist.length > 0) {
        setShuffledQueue(generateShuffledQueue(playlist.length, currentSongIndex));
      }
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!settings.keyboardShortcuts || e.repeat) return;
      
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.code === 'Space' || e.code === 'KeyK') && currentSong && !isPlayerClosed) {
        e.preventDefault();
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play().catch(err => { if (err.name !== 'AbortError') console.error("Audio play failed", err) });
            setIsPlaying(true);
          } else {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
      } else if (e.code === 'KeyF' && currentSong && !isPlayerClosed) {
        e.preventDefault();
        setIsFullScreen(prev => !prev);
      } else if (e.code === 'KeyL' && currentSong && !isPlayerClosed) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-lyrics'));
      } else if (e.code === 'KeyS' && currentSong && !isPlayerClosed) {
        e.preventDefault();
        toggleShuffleState();
      } else if (e.code === 'KeyO' && currentSong && !isPlayerClosed) {
        e.preventDefault();
        setLoopMode(prev => (prev + 1) % 3);
      } else if (e.code === 'ArrowRight' && currentSong && !isPlayerClosed) {
        e.preventDefault();
        handlersRef.current.playNext();
      } else if (e.code === 'ArrowLeft' && currentSong && !isPlayerClosed) {
        e.preventDefault();
        handlersRef.current.playPrev();
      } else if (e.code === 'KeyG' && currentSong && !isPlayerClosed) {
        e.preventDefault();
        const isFake = currentSong.name.endsWith('[Fake Leak]') || (currentEra?.name || '').includes('Fake');
        const isStems = currentSong.name.endsWith('[Stems]') || (currentEra?.name || '').includes('Stems');
        const isMisc = currentSong.name.endsWith('[Misc]') || (currentEra?.name || '').includes('Misc');
        if (currentSong.name !== "Kanye West/Kendrick Lamar/QoQinox - Alright but the beat is Father Stretch My Hands Pt. 1" && !isFake && !isStems && !isMisc) {
          toggleFavorite(currentSong, currentEra?.name || '');
        }
      } else if (e.code === 'KeyD' && currentSong && !isPlayerClosed) {
        e.preventDefault();
        const rawUrl = currentSong.url || (currentSong.urls && currentSong.urls.length > 0 ? currentSong.urls[0] : '');
        handleDownloadFile(rawUrl, currentSong.name, settings.tagsAsEmojis);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSong, isPlayerClosed, settings.keyboardShortcuts, currentEra]);

  useEffect(() => {
    const handleEasterEgg = () => {
      const easterEggSong: Song = {
        name: "Kanye West/Kendrick Lamar/QoQinox - Alright but the beat is Father Stretch My Hands Pt. 1",
        url: "https://pillows.su/f/995251ad1569bf2e298af3e8c6a3bed8",
        extra: "Easter Egg",
        description: "Fire Song",
        quality: "Lossless"
      };
      const easterEggEra: Era = {
        name: "Easter egg",
        image: "https://i.imagesup.co/images2/36f0a02c25b5e237dc6ca3762a3453d4b6ff36f7.jpg",
        data: {},
      };
      handlePlaySong(easterEggSong, easterEggEra, [easterEggSong], true);
    };

    window.addEventListener('play-easter-egg', handleEasterEgg);
    return () => window.removeEventListener('play-easter-egg', handleEasterEgg);
  }, []);

  useEffect(() => {
    if (settings.notificationWhenPlaying && currentSong && document.hidden) {
      if (Notification.permission === 'granted') {
        const actualEraName = (currentSong as any).realEra?.name || currentEra?.name;
        const artist = parseArtistFromSong(currentSong.name, currentSong.extra, actualEraName);
        const coverImage = currentSong.image || (currentSong as any).realEra?.image || currentEra?.image || 'https://i.ibb.co/mrK8W4rL/image-2026-03-22-142639537.png';
        
        const notificationTitle = formatTextForNotification(currentSong.name, settings.tagsAsEmojis);
        const notificationBody = formatTextForNotification(artist, settings.tagsAsEmojis);

        try {
          new Notification(notificationTitle, {
            body: notificationBody,
            icon: coverImage,
            silent: true
          });
        } catch (e) {
          console.error("Notification failed", e);
        }
      }
    }
  }, [currentSong, settings.notificationWhenPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);

      if (lastfmLoggedIn && currentSong && currentEra && !scrobbledRef.current) {
        const dur = audioRef.current.duration;
        const cur = audioRef.current.currentTime;
        if (dur > 30 && (cur > dur / 2 || cur > 240)) {
          scrobbledRef.current = true;
          const actualEraName = (currentSong as any).realEra?.name || currentEra.name;
          const cleanActualEraName = cleanAlbumName(actualEraName).replace(/ \[Fake\]$/i, '');
          const cleanRealTrackName = currentSong.name.replace(/ \[Fake\]$/i, '');
          const lfmTrack = cleanTrackName(cleanRealTrackName, currentSong.extra, settings.lastfmShowVersion, settings.lastfmShowTags, settings.lastfmShowFeats);
          const lfmArtist = parseArtistFromSong(cleanRealTrackName, currentSong.extra, actualEraName);
          scrobbleTrack(
            lfmTrack,
            lfmArtist,
            cleanActualEraName,
            songStartTimeRef.current,
            Math.floor(dur)
          );
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      audioRef.current.volume = volume;
      if (timeToRestoreRef.current !== null) {
        audioRef.current.currentTime = timeToRestoreRef.current;
        setCurrentTime(timeToRestoreRef.current);
        timeToRestoreRef.current = null;
      }
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleCategoryChange = (cat: Category) => {
    if (cat === 'music' && selectedAlbum) {
      if (!finalErasArray.find(e => e.name === selectedAlbum.name)) {
        setSelectedAlbum(null);
      }
    } else if (cat === 'related' && selectedAlbum) {
      if (!relatedErasArray.find(e => e.name === selectedAlbum.name)) {
        setSelectedAlbum(null);
      }
    } else if (cat === 'tracklists' && selectedAlbum) {
      if (!finalErasArray.find(e => e.name === selectedAlbum.name)) {
        setSelectedAlbum(null);
      }
    }
    setActiveCategory(cat);
  };

  const handleHomeClick = () => {
    setSelectedAlbum(null);
    if (!settings.rememberSearch) {
      setSearchQuery('');
    }
    setActiveCategory('music');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-yzy-black text-white">
        <div className="animate-pulse text-sm font-bold tracking-widest uppercase text-white/50">Loading Songs...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-yzy-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm text-red-500">Failed to load data.</div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-4 py-2 border border-white/20 rounded hover:bg-white/10 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

let erasArray = (Object.values(data.eras || {}) as Era[])
  .filter(era => !HIDDEN_ALBUMS.includes(era.name))
  .map(era => ({
    ...era,
    fileInfo: CUSTOM_ALBUM_INFO[era.name] || era.fileInfo
  })) as Era[];

let relatedErasArray = (Object.values(data.eras || {}) as Era[])
  .filter(era => HIDDEN_ALBUMS.includes(era.name))
  .map(era => ({
    ...era,
    fileInfo: CUSTOM_ALBUM_INFO[era.name] || era.fileInfo
  })) as Era[];

// Turbo Grafix 16 arrives renamed (was "Turbo Grafx 16") so it gets appended to the end
// of the eras object. Wolves has no CSV entry and is seeded after the API response, also
// landing at the end. Pull both out and reinsert right after Cruel Winter [V2].
{
  const cwV2Idx = erasArray.findIndex(e => e.name === "Cruel Winter [V2]");
  const turboIdx = erasArray.findIndex(e => e.name === "Turbo Grafix 16");
  const wolvesIdx = erasArray.findIndex(e => e.name === "Wolves");

  if (cwV2Idx !== -1 && turboIdx !== -1 && wolvesIdx !== -1) {
    const turboEra = erasArray[turboIdx];
    const wolvesEra = erasArray[wolvesIdx];
    [turboIdx, wolvesIdx].sort((a, b) => b - a).forEach(i => erasArray.splice(i, 1));
    const newCwV2Idx = erasArray.findIndex(e => e.name === "Cruel Winter [V2]");
    erasArray.splice(newCwV2Idx + 1, 0, turboEra, wolvesEra);
  }
}


  const favoritesEra: Era | null = favoriteKeys.length > 0 ? {
    fileInfo: [],
    name: "Favorites",
    image: "https://i.ibb.co/JFnmJ8rX/image.png",
    data: {
      "Favorite Tracks": favoriteKeys.map(k => {
        let realEra = erasArray.find(e => e.name === k.eraName) || relatedErasArray.find(e => e.name === k.eraName);
        if (!realEra && k.eraName === 'Recent Leaks') {
            realEra = { fileInfo: [], name: "Recent Leaks", image: "https://i.ibb.co/7xRv4H2r/sdffsdsdf.png", data: { "Latest Additions": recentData } };
        }
        
        let foundSong: Song | null = null;
        if (realEra && realEra.data) {
           const allSongs = Object.values(realEra.data).flat();
           foundSong = allSongs.find(s => s.name === k.songName && (s.url || (s.urls && s.urls.length > 0 ? s.urls[0] : '')) === k.url) as Song;
        }
        if (!foundSong && k.eraName === 'Recent Leaks') {
           foundSong = recentData.find(s => s.name === k.songName && (s.url || (s.urls && s.urls.length > 0 ? s.urls[0] : '')) === k.url) as Song;
        }
        if (!foundSong && k.song) {
           foundSong = k.song;
        }

        if (foundSong) {
           const actualRealEra = (realEra?.name === 'Recent Leaks' ? Object.values(data?.eras || {}).find((e: any) => e.name === foundSong!.extra) : realEra) as Era;
           const rawEraName = foundSong.extra2 || foundSong.extra;
           const cleanEraName = rawEraName ? getCleanSongNameWithTags(rawEraName) : '';
           const actualRealEraNameSearch = actualRealEra?.name || '';
           return { ...foundSong, realEra: actualRealEra, image: CUSTOM_IMAGES[rawEraName || ''] || CUSTOM_IMAGES[cleanEraName || ''] || CUSTOM_IMAGES[actualRealEraNameSearch || ''] || actualRealEra?.image || foundSong.image || "https://i.ibb.co/JFnmJ8rX/image.png" };
        }
        return null;
      }).filter(s => s !== null) as Song[]
    }
  } : null;

  const finalErasArray = [...erasArray];
  if (favoritesEra) {
    const beforeIndex = finalErasArray.findIndex(e => e.name === "Before The College Dropout");
    if (beforeIndex !== -1) {
      finalErasArray.splice(beforeIndex, 0, favoritesEra);
    } else {
      finalErasArray.unshift(favoritesEra);
    }
  }

  const filteredEras = finalErasArray.filter(era => {
    const hasActiveFilters = filters.tags.length > 0 || filters.qualities.length > 0 || filters.availableLengths?.length > 0 || filters.durationValue !== '' || filters.playableOnly || filters.hasClips !== null || filters.hasRemixes !== null || filters.hasSamples !== null;

    if (!searchQuery && !hasActiveFilters) return true;

    const allSongs = Object.values(era.data || {}).flat();

    const matchingSongs = allSongs.filter(song => {
      if (!matchesFilters(song, searchQuery, filters)) return false;

      if (filters.hasClips) {
        const has = findMvsForSong(song.name, era.name, mvData).length > 0;
        if (filters.hasClips === 'include' && !has) return false;
        if (filters.hasClips === 'exclude' && has) return false;
      }

      if (filters.hasRemixes) {
        const has = findRemixesForSong(song.name, era.name, remixData).length > 0;
        if (filters.hasRemixes === 'include' && !has) return false;
        if (filters.hasRemixes === 'exclude' && has) return false;
      }

      if (filters.hasSamples) {
        const has = findSamplesForSong(song.name, era.name, samplesData).length > 0;
        if (filters.hasSamples === 'include' && !has) return false;
        if (filters.hasSamples === 'exclude' && has) return false;
      }

      return true;
    });

    if (hasActiveFilters) {
      return matchingSongs.length > 0;
    }

    return era.name.toLowerCase().includes(searchQuery.toLowerCase()) || matchingSongs.length > 0;
  });

  const filteredRelatedEras = relatedErasArray.filter(era => {
    const hasActiveFilters = filters.tags.length > 0 || filters.qualities.length > 0 || filters.availableLengths?.length > 0 || filters.durationValue !== '' || filters.playableOnly || filters.hasClips !== null || filters.hasRemixes !== null || filters.hasSamples !== null;

    if (!searchQuery && !hasActiveFilters) return true;

    const allSongs = Object.values(era.data || {}).flat();

    const matchingSongs = allSongs.filter(song => {
      if (!matchesFilters(song, searchQuery, filters)) return false;

      if (filters.hasClips) {
        const has = findMvsForSong(song.name, era.name, mvData).length > 0;
        if (filters.hasClips === 'include' && !has) return false;
        if (filters.hasClips === 'exclude' && has) return false;
      }

      if (filters.hasRemixes) {
        const has = findRemixesForSong(song.name, era.name, remixData).length > 0;
        if (filters.hasRemixes === 'include' && !has) return false;
        if (filters.hasRemixes === 'exclude' && has) return false;
      }

      if (filters.hasSamples) {
        const has = findSamplesForSong(song.name, era.name, samplesData).length > 0;
        if (filters.hasSamples === 'include' && !has) return false;
        if (filters.hasSamples === 'exclude' && has) return false;
      }

      return true;
    });

    if (hasActiveFilters) {
      return matchingSongs.length > 0;
    }

    return era.name.toLowerCase().includes(searchQuery.toLowerCase()) || matchingSongs.length > 0;
  });

  const recentEra: Era = {
    name: "Recent Leaks",
    image: "https://i.ibb.co/7xRv4H2r/sdffsdsdf.png",
    data: {
      "Latest Additions": recentData
        .filter(song => {
           const eName = song.extra2 || song.extra;
           return eName !== 'NASIR' && eName !== 'K.T.S.E.' && eName !== 'NEVER STOP' && eName !== 'DAYTONA' && eName !== 'The Elementary School Dropout';
        })
        .map(song => {
          const rawEraName = song.extra2 || song.extra;
          const cleanEraName = rawEraName ? getCleanSongNameWithTags(rawEraName) : '';
          const realEra = Object.values(data?.eras || {}).find((e: any) => e.name === rawEraName || e.name === cleanEraName) as Era;
          return {
            ...song,
            image: CUSTOM_IMAGES[rawEraName || ''] || CUSTOM_IMAGES[cleanEraName || ''] || CUSTOM_IMAGES[realEra?.name || ''] || realEra?.image || song.image,
            realEra
          };
        })
    }
  };

  const handleRandomSongClick = () => {
    if (!data?.eras) return;
    
    const allMusicSongs: (Song & { realEra: Era })[] = [];
    Object.keys(data.eras).forEach(eraKey => {
      const era = data.eras[eraKey];
      
      if (era.name === 'NASIR' || era.name === 'K.T.S.E.' || era.name === 'NEVER STOP' || era.name === 'DAYTONA') return;

      if (era.data) {
        Object.values(era.data).flat().forEach(song => {
          const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
          const isNotAvailable = isSongNotAvailable(song, rawUrl);
          const isPlayable = rawUrl && (rawUrl.includes('pillows.su/f/') || rawUrl.includes('temp.imgur.gg/f/')) && !isNotAvailable;
          
          if (isPlayable) {
             allMusicSongs.push({ ...song, realEra: era });
          }
        });
      }
    });

    if (allMusicSongs.length === 0) return;

    const randomIdx = Math.floor(Math.random() * allMusicSongs.length);
    const randomSong = allMusicSongs[randomIdx];

    let contextPlaylist: Song[] = [];
    if (isShuffle) {
      const others = allMusicSongs.filter((_, idx) => idx !== randomIdx);
      const shuffledOthers = others.sort(() => 0.5 - Math.random()).slice(0, 50);
      contextPlaylist = [randomSong, ...shuffledOthers];
    } else {
      contextPlaylist = [randomSong];
    }

    handlePlaySong(randomSong, randomSong.realEra, contextPlaylist, true, true, true);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden relative bg-yzy-black">
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        crossOrigin="anonymous"
        playsInline
      />

      <AnimatePresence>
        {popupUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-xl w-full h-full max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
                <div className="flex items-center gap-2 max-w-[80%]">
                  <span className="text-white/50 text-sm">External Link:</span>
                  <span className="text-white font-medium truncate text-sm">{popupUrl}</span>
                </div>
                <button
                  onClick={() => setPopupUrl(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 bg-white w-full h-full relative">
                <iframe 
                  src={popupUrl} 
                  className="w-full h-full border-0 absolute inset-0"
                  allow="fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        <Navbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filters={filters}
          setFilters={setFilters}
          onHomeClick={handleHomeClick}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          lastfmLoggedIn={lastfmLoggedIn}
          onLastfmLogout={() => setLastfmLoggedIn(false)}
          onRandomSongClick={handleRandomSongClick}
          isRandomMode={isRandomMode}
        />

        <main className={`flex-1 overflow-y-auto relative scroll-smooth bg-[#0a0a0a] flex flex-col ${currentSong && !isFullScreen && !isPlayerClosed ? 'pb-44 md:pb-28' : ''}`}>
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {activeCategory === 'settings' ? (
                <SettingsView key="settings" onCategoryChange={setActiveCategory} searchQuery={searchQuery} />
              ) : activeCategory === 'history' ? (
                <HistoryView key="history" searchQuery={searchQuery} filters={filters} eras={erasArray} historyData={recentData} />
              ) : activeCategory === 'art' ? (
                <ArtGallery key="art" eras={erasArray} artData={artData} searchQuery={searchQuery} filters={filters} />
              ) : activeCategory === 'stems' ? (
                <StemsView
                  key="stems"
                  eras={erasArray}
                  stemsData={stemsData}
                  searchQuery={searchQuery}
                  filters={filters}
                  onPlaySong={handlePlaySong}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  mvData={mvData}
                  remixData={remixData}
                  samplesData={samplesData}
                  toggleFavorite={toggleFavorite}
                  favoriteKeys={favoriteKeys}
                />
              ) : activeCategory === 'misc' ? (
                <MiscView
                  key="misc"
                  eras={erasArray}
                  miscData={miscData}
                  searchQuery={searchQuery}
                  filters={filters}
                  onPlaySong={handlePlaySong}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  mvData={mvData}
                  remixData={remixData}
                  samplesData={samplesData}
                  toggleFavorite={toggleFavorite}
                  favoriteKeys={favoriteKeys}
                />

              ) : activeCategory === 'tracklists' && selectedAlbum ? (
                <TracklistsView
                  key={`tracklists-${selectedAlbum.name}`}
                  data={tracklistsData.filter(t => t.era.toLowerCase() === selectedAlbum.name.toLowerCase())}
                  searchQuery={searchQuery}
                  eras={[...erasArray, ...relatedErasArray]}
                  onPlaySong={handlePlaySong}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  era={selectedAlbum}
                  onBack={() => setSelectedAlbum(null)}
                />
              ) : activeCategory === 'tracklists' ? (
                <EraGrid key="tracklists-grid" eras={filteredEras} onSelectEra={setSelectedAlbum} />
              ) : activeCategory === 'fakes' ? (
                <FakesView
                  key="fakes"
                  eras={erasArray}
                  fakesData={fakesData}
                  searchQuery={searchQuery}
                  filters={filters}
                  onPlaySong={handlePlaySong}
                  currentSong={currentSong || null}
                  isPlaying={isPlaying}
                  toggleFavorite={toggleFavorite}
                  favoriteKeys={favoriteKeys}
                />
              ) : activeCategory === 'recent' ? (
                <EraDetail
                  key="recent"
                  era={recentEra}
                  onPlaySong={handlePlaySong}
                  searchQuery={searchQuery}
                  filters={filters}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  mvData={mvData}
                  remixData={remixData}
                  samplesData={samplesData}
                  favoriteKeys={favoriteKeys}
                  toggleFavorite={toggleFavorite}
                />
              ) : selectedAlbum ? (
                <EraDetail
                  key={selectedAlbum.name}
                  era={selectedAlbum}
                  onBack={() => {
                    setSelectedAlbum(null);
                    if (!settings.rememberSearch) {
                      setSearchQuery('');
                    }
                  }}
                  onPlaySong={handlePlaySong}
                  searchQuery={searchQuery}
                  filters={filters}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  mvData={mvData}
                  remixData={remixData}
                  samplesData={samplesData}
                  favoriteKeys={favoriteKeys}
                  toggleFavorite={toggleFavorite}
                />
              ) : activeCategory === 'related' ? (
                <EraGrid key="related-grid" eras={filteredRelatedEras} onSelectEra={setSelectedAlbum} />
              ) : (
                <EraGrid key="grid" eras={filteredEras} onSelectEra={setSelectedAlbum} />
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto px-6 py-8 text-center border-t border-white/5">
            <p className="text-[10px] text-white/30 leading-relaxed">
              YƵYGOLD does not host or hold any illegal files. All links are external and provided as-is for educational and archival purposes only.
            </p>
            <p className="text-[10px] text-white/30 leading-relaxed">
              YZYGOLD 2026 © [V1.5.4]
            </p>
            <p className="text-[10px] text-white/30 leading-relaxed mt-1">
              <a href="https://docs.google.com/spreadsheets/d/12nGHPPh5dVTfLuBLVQYzC3QgPxKfvp-jgCoNccvEasM/" target="_blank" rel="noopener noreferrer" className="text-[var(--theme-color)]/50 hover:text-[var(--theme-color)] transition-colors underline">Link For The Sheet</a>
            </p>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {currentSong && !isFullScreen && !isPlayerClosed && (
          <PlayerBar
            currentSong={currentSong}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            onFullScreen={() => {
              setIsFullScreen(true);
              setShowQueue(false);
            }}
            onClose={() => setIsPlayerClosed(true)}
            era={currentEra}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            volume={volume}
            onVolumeChange={setVolume}
            onNext={playNext}
            onPrev={playPrev}
            isShuffle={isShuffle}
            toggleShuffle={toggleShuffleState}
            loopMode={loopMode}
            toggleLoop={() => setLoopMode((prev) => (prev + 1) % 3)}
            isFavorite={favoriteKeys.some(k => k.songName === currentSong.name && k.url === (currentSong.url || (currentSong.urls && currentSong.urls[0]) || ''))}
            toggleFavorite={() => toggleFavorite(currentSong, currentEra?.name || '')}
            onShowQueue={() => setShowQueue(true)}
            showQueue={showQueue}
            setShowQueue={setShowQueue}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPlayerClosed && currentSong && !isFullScreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.8, ease: [0.2, 0, 0, 1] } }}
            transition={{ duration: 1.5, ease: [0.2, 0, 0, 1] }}
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform drop-shadow-2xl"
            onClick={() => setIsPlayerClosed(false)}
            title="Restore Player"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 2000 2000">
              <circle fill="#111" stroke="#1d1d1d" strokeWidth="40" cx="1000.5" cy="1000.5" r="890.5"/>
              <g transform="translate(1000.5, 1020)">
                <path stroke="white" strokeWidth="80" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M -250 125 L 0 -125 L 250 125" />
              </g>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFullScreen && currentSong && (
          <FullScreenPlayer
            currentSong={currentSong}
            nextSong={playlist.length > 0 ? playlist[(currentSongIndex + 1) % playlist.length] : null}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            onClose={() => setIsFullScreen(false)}
            era={currentEra}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            audioRef={audioRef}
            analyserRef={analyserRef}
            onNext={playNext}
            onPrev={playPrev}
            isShuffle={isShuffle}
            toggleShuffle={toggleShuffleState}
            loopMode={loopMode}
            toggleLoop={() => setLoopMode((prev) => (prev + 1) % 3)}
            playlist={playlist}
            currentSongIndex={currentSongIndex}
            shuffledQueue={shuffledQueue}
            volume={volume}
            onVolumeChange={setVolume}
            onPlaySong={(idx) => {
              setCurrentSongIndex(idx);
              const targetSong = playlist[idx];
              if (targetSong && currentEra) {
                const eraToPass = (targetSong as any).realEra || currentEra;
                handlePlaySong(targetSong, eraToPass, playlist, true, true, isRandomMode);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQueue && (
          <QueueModal
            onClose={() => setShowQueue(false)}
            playlist={playlist}
            currentSongIndex={currentSongIndex}
            shuffledQueue={shuffledQueue}
            isShuffle={isShuffle}
            loopMode={loopMode}
            currentEra={currentEra}
            onPlaySong={(idx) => {
              setCurrentSongIndex(idx);
              const targetSong = playlist[idx];
              if (targetSong && currentEra) {
                const eraToPass = (targetSong as any).realEra || currentEra;
                handlePlaySong(targetSong, eraToPass, playlist, true, true, isRandomMode);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLastfmErrorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-xl max-w-lg w-full p-6 md:p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight font-display">
                Please log off & log in back to your Last.fm account from the site!
              </h2>
              
              <div className="space-y-4 mb-8 text-sm text-white/70 leading-relaxed font-medium">
                <p>
                  Vercel (The Hosting of yzygold) had a data breach, including my last.fm api keys! I needed to reset the keys, and now the old last.fm api key that you are using is not working!
                </p>
                <p>
                  dont worry, you are not infected, and the site is not infected. Passwords from last.fm are protected.
                </p>
              </div>

              <button
                onClick={() => setShowLastfmErrorModal(false)}
                className="w-full bg-[var(--theme-color)] text-black font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-[var(--theme-color)]/90 transition-colors"
              >
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChangelog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-xl max-w-lg w-full p-6 md:p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-1 tracking-tight font-display">
                YZYgold Version 1.5
              </h2>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-6">Ownership Transfer</p>

              <div className="space-y-4 mb-8 text-sm text-white/70 leading-relaxed">
                <ul className="space-y-3">
                  <li>Site has transferred ownership to <strong className="text-white">u/yzyarchives</strong></li>
                  <li>Most importantly — <strong className="text-white">SITE HAS NO ADS</strong></li>
                  <li>
                    <strong className="text-white">Tracklists tab</strong>
                    <br />Here you can play, access and download different tracklists
                  </li>
                  <li>
                    <strong className="text-white">Last.fm</strong>
                    <br />Due to the transfer of ownership the Last.fm keys had to be reset, please relink your Last.fm account to YZYgold
                  </li>
                </ul>

                <div className="border-t border-white/10 pt-4 space-y-2 text-white/50 text-xs">
                  <p>
                    <a href="https://docs.google.com/document/d/1b8aidNuSLLHfzgzrJ0uGdWHPuo-uNk6wI21Vscwzid4/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-[var(--theme-color)] hover:underline">
                      See the full changelog here
                    </a>
                  </p>
                  <p>
                    Report any bugs to our subreddit:{' '}
                    <a href="https://www.reddit.com/r/yzygold/" target="_blank" rel="noopener noreferrer" className="text-[var(--theme-color)] hover:underline">
                      r/yzygold
                    </a>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowChangelog(false);
                  localStorage.setItem('v1_5_ownership_seen', 'true');

                  const userAgent = navigator.userAgent.toLowerCase();
                  const isBrowserSafari = userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('crios') && !userAgent.includes('android');
                  if (isBrowserSafari) {
                    setTimeout(() => setShowSafariWarning(true), 400);
                  }
                }}
                className="w-full bg-[var(--theme-color)] text-black font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-[var(--theme-color)]/90 transition-colors"
              >
                Got It
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSafariWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-xl max-w-lg w-full p-6 md:p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight font-display text-center">
                Safari Not Recommended
              </h2>
              <div className="space-y-4 mb-8 text-sm text-white/70 leading-relaxed font-medium text-center">
                <p>
                  It looks like you are using Safari. This site does not working well on Safari and it is highly recommended to use Google Chrome or any other browser for the best experience.
                </p>
              </div>
              <button
                onClick={() => setShowSafariWarning(false)}
                className="w-full bg-[var(--theme-color)] text-black font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-[var(--theme-color)]/90 transition-colors"
              >
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDiscordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-xl max-w-lg w-full p-6 md:p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight font-display text-center">
                Discord Rich Presence
              </h2>
              <div className="space-y-4 text-sm text-white/70 leading-relaxed font-medium text-center">
                <p>To use this feature, you must install the requested browser extension.</p>
                <div className="py-4">
                  <a 
                    href="https://chromewebstore.google.com/detail/premid/pnapphbjbnhnnaoaamigfghfkefojekp" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 bg-[var(--theme-color)] text-black font-bold uppercase px-6 py-2 rounded-lg hover:bg-[var(--theme-color)]/90 transition-colors"
                  >
                    Install Extension
                  </a>
                </div>
                <p className="text-xs text-white/40">Once installed, your current song will appear on your Discord profile.</p>
              </div>
              <div className="mt-8">
                <button
                  onClick={() => setShowDiscordModal(false)}
                  className="w-full bg-white/10 text-white font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full shadow-[0_8px_30px_rgb(255,255,255,0.2)] text-[15px] font-bold tracking-wide z-[10100] flex items-center gap-3"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
