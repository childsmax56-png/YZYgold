import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from './SettingsContext';

export const TAG_TOOLTIP_MAP: Record<string, string> = {
  'Best Of': 'some of the best leaks hosted on the tracker.',
  'Grails': 'the most wanted songs that have not yet leaked in full.',
  'Wanted': 'Songs that are wanted, but not as wanted as "Grails".',
  'Special': 'special songs that are not good enough to be in Best Of, but still deserves to be highlighted.',
  'Worst Of': 'some of the worst leaks hosted on the tracker.',
  'Unwanted': 'Songs that we don\'t want to leak in full because they\'re shit',
  'AI': 'Track contains AI vocals.',
  'Lost Media': 'Is currently lost, or we don\'t have a link to the media.',
  'By YƵYGOLD': 'Leaks & Songs that added by the owner of the site.'
};

export const CUSTOM_IMAGES: Record<string, string> = {
  "Before The College Dropout": "https://r2.artistgrid.cx/14381176210245215860",
  "The College Dropout": "https://i.ibb.co/mrK8W4rL/image-2026-03-22-142639537.png",
  "Late Registration": "https://r2.artistgrid.cx/2479627241109284241",
  "Graduation": "https://r2.artistgrid.cx/99264847627143853",
  "808s & Heartbreak": "https://r2.artistgrid.cx/4068608925510243940",
  "Good Ass Job": "https://r2.artistgrid.cx/11988109585537492881",
  "My Beautiful Dark Twisted Fantasy": "https://r2.artistgrid.cx/3189215631586159206",
  "Watch The Throne": "https://r2.artistgrid.cx/16977599897222223402",
  "Thank God For Drugs": "https://r2.artistgrid.cx/13546253665020908064",
  "Yeezus": "https://r2.artistgrid.cx/10340158507111146128",
  "Cruel Winter [V1]": "https://r2.artistgrid.cx/6905178741176124133",
  "Yeezus 2": "https://r2.artistgrid.cx/3490514260284456558",
  "SWISH": "https://r2.artistgrid.cx/3811074283597140401",
  "ye": "https://r2.artistgrid.cx/3675141611650108586",
  "KIDS SEE GHOSTS": "https://r2.artistgrid.cx/1801523737312539730",
  "Good Ass Job (2018)": "https://r2.artistgrid.cx/1381927594051718461",
  "Yandhi [V1]": "https://r2.artistgrid.cx/6392738867962638578",
  "Yandhi [V2]": "https://r2.artistgrid.cx/16077241178186864707",
  "JESUS IS KING": "https://r2.artistgrid.cx/15563101222135825089",
  "God's Country": "https://r2.artistgrid.cx/18258567973514378297",
  "JESUS IS KING: The Dr. Dre Version": "https://r2.artistgrid.cx/5338565897126344808",
  "DONDA [V1]": "https://r2.artistgrid.cx/10194753781351863336",
  "Donda [V2]": "https://r2.artistgrid.cx/1414767734423155052",
  "Donda [V3]": "https://r2.artistgrid.cx/7999835120988525392",
  "Donda 2": "https://r2.artistgrid.cx/5946563812736052853",
  "WAR": "https://r2.artistgrid.cx/1930404166392338299",
  "YEBU": "https://r2.artistgrid.cx/14724798867274744372",
  "Bad Bitch Playbook": "https://r2.artistgrid.cx/2457961264253364501",
  "VULTURES 2": "https://r2.artistgrid.cx/830728387670656049",
  "VULTURES 3": "https://r2.artistgrid.cx/15539423876084095313",
  "BULLY [V1]": "https://r2.artistgrid.cx/9159850975910127017",
  "CUCK": "https://r2.artistgrid.cx/14034016915374212521",
  "DONDA 2 (2025)": "https://r2.artistgrid.cx/6920900025680557230",
  "IN A PERFECT WORLD": "https://r2.artistgrid.cx/16941695483228620962",
  "BULLY [V2]": "https://r2.artistgrid.cx/12263051515513035581",
  "The Life Of Pablo": "https://i.ibb.co/n8DkztcP/image-2026-03-22-142914834.png",
  "TurboGrafx 16": "https://i.ibb.co/q3fggHMz/image-2026-03-22-143044324.png",
  "The Elementary School Dropout": "https://i.ibb.co/Z1RZYGWw/image-2026-03-22-143132521.png",
  "LOVE EVERYONE": "https://i.ibb.co/Tq7HkRKn/cell-Image-199908479-18.png",
  "Cruel Summer": "https://i.ibb.co/wr7sS6DH/cell-Image-199908479-8.png",
  "So Help Me God": "https://i.ibb.co/Lz3b2xDD/cell-Image-199908479-13.png",
  "VULTURES 1": "https://i.ibb.co/5hFN28jM/cell-Image-199908479-37.png",
  "Cruel Winter [V2]": "https://i.ibb.co/bjFdyLjv/image-2026-04-28-131805413.png",
  "Ongoing": "https://i.ibb.co/dwZ4cwmd/image-2026-04-27-185921217.png"
};

export const ALBUM_RELEASE_DATES: Record<string, string> = {
  "Before The College Dropout": "??/??/????",
  "The College Dropout": "02/10/2004",
  "Late Registration": "08/30/2005",
  "Graduation": "09/11/2007",
  "808s & Heartbreak": "11/24/2008",
  "Good Ass Job": "??/??/2009",
  "My Beautiful Dark Twisted Fantasy": "11/22/2010",
  "Watch The Throne": "08/08/2011",
  "Cruel Summer": "09/14/2012",
  "Thank God For Drugs": "??/??/2012",
  "Yeezus": "06/18/2013",
  "Cruel Winter [V1]": "??/??/2013",
  "Yeezus 2": "??/??/2014",
  "So Help Me God": "??/??/????",
  "SWISH": "??/??/2015",
  "The Life Of Pablo": "02/14/2016",
  "Cruel Winter [V2]": "??/??/????",
  "Wolves": "??/??/2016",
  "TurboGrafx 16": "??/??/2016",
  "LOVE EVERYONE": "??/??/2018",
  "DAYTONA": "05/25/2018",
  "ye": "06/01/2018",
  "KIDSSEEGHOSTS": "06/08/2018",
  "NASIR": "06/15/2018",
  "K.T.S.E.": "06/23/2018",
  "Good Ass Job (2018)": "??/??/2018",
  "Yandhi [V1]": "??/??/2018",
  "Yandhi [V2]": "??/??/????",
  "JESUS IS KING": "10/25/2019",
  "God's Country": "??/??/????",
  "JESUS IS KING: The Dr. Dre Version": "??/??/????",
  "DONDA [V1]": "07/18/2020",
  "Donda [V2]": "??/??/????",
  "Donda [V3]": "08/29/2021",
  "Donda 2": "??/??/????",
  "WAR": "04/01/2022",
  "YEBU": "??/??/????",
  "Bad Bitch Playbook": "??/??/2023",
  "VULTURES 1": "02/10/2024",
  "VULTURES 2": "08/03/2024",
  "The Elementary School Dropout": "03/10/2024",
  "VULTURES 3": "??/??/????",
  "BULLY [V2]": "03/28/2026",
  "BULLY [V1]": "03/18/2025",
  "CUCK": "03/06/2025",
  "DONDA 2 (2025)": "04/29/2025",
  "NEVER STOP": "06/27/2025",
  "IN A PERFECT WORLD": "06/22/2025"
};

export const HIDDEN_ALBUMS = ['NASIR', 'K.T.S.E.', 'NEVER STOP', 'DAYTONA', 'The Elementary School Dropout'];

export const ALBUM_DESCRIPTIONS: Record<string, string> = {
  "DAYTONA": "DAYTONA is the third studio album by American rapper Pusha T. It was released on May 25, 2018, by G.O.O.D. Music and Def Jam Recordings. DAYTONA was announced by Kanye West via Twitter on April 19, 2018, alongside the album's release date. It was one of the Wyoming projects worked on during 2018 by Kanye.",
  "K.T.S.E.": "In an interview with Hot 97 in March of 2018, Taylor revealed that she had been working on music with Kanye in Wyoming, referring to him as \"Polo 'Ye\" - alluding to him returning to his old \"Polo-shirt roots\" (i.e. TCD-era production). The album was eventually put on the tail end of the Wyoming releases, releasing June 22nd, 2018. Kanye was notably still finishing the album on the plane ride to the albums LP, as confirmed in a Tweet from Kim Kardashian.",
  "NEVER STOP": "NEVER STOP is a collaborative album by American rappers King Combs and Ye. King Combs is the son of rapper Diddy. It was released on June 27, 2025, though Goodfellas Entertainment. It follows Combs' second extended play, C3. The album is the first collaborative project from Combs and the sixth collaborative effort from Ye. Combs and West served as executive producers on the album alongside lead artists, and West's daughter North, Jaas, and the Hooligans served as features.",
  "NASIR": "After the 2012 release of Life Is Good, Nas announced in January 2013 that he was working on a new album. Time would pass with little-word on the project, until the 2014 remix to ScHoolboy Q's \"Studio\", where Nas rapped that he, \"finished up [his] new album\" - however, no album ever materialized. In March 2016, Kanye Tweeted that he \"promised Obama Ima do beats on NAS' next album\". As if it was fate, on April 23rd, 2018, Kanye announced that he was executive producing Nas' next album. The album followed its expected release date, dropping June 15th, 2018.",
  "The Elementary School Dropout": "",
  "Before The College Dropout": "Before Kanye released his first album to critical acclaim in 2004, he pursued many other projects, including a rap trio group named the \"Go Getters\" and production for other rappers, including, but not limited to JAY-Z, Common, Talib Kweli, and Scarface. Two years before the release of The College Dropout, Kanye began releasing a series of mixtapes to generate hype and publicity for the eventual release of his first album. Kanye eventually signed with Roc-A-Fella records in August 2002.",
  "The College Dropout": "Following his signing to Roc-A-Fella Records, Kanye released his debut studio album, The College Dropout. It features string arrangements, choirs, and his signature soul sampling, frequently branded as \"chipmunk soul\" for its sped-up and high-pitched nature. Contrary to the popular gangster-persona lyrics at the time, his songs mostly revolved around themes of family, materialism, religion, and racism. The inspiration for finally making his music came when he was in a near-fatal car crash.",
  "Late Registration": "Late Registration continues the social themes introduced in The College Dropout, but now with orchestral production influenced by co-producer Jon Brion. Kanye's newfound success allowed him to expand his ambitions from a single violinist to an entire string orchestra, mixing it with production including chipmunk soul and lullaby-like instrumentals. Lyrically, the album features a mix of more socially charged songs to more personal cuts. Production-wise, inspiration came from artists such as British trip-hop band Portishead and Fiona Apple's second album When The Pawn…",
  "Graduation": "Graduation is the third studio album from Kanye West. Inspiration came from stadium tours, indie rock, and house music. It was a considerable departure from the sound Kanye had used on his first two studio albums, which featured samples and inspirations from the soul and orchestral music Kanye grew up alongside. This album included a much more electronic sound, featuring layering synthesizers. Lyrically, Kanye analyzes himself and talks about his life after becoming famous and how the media criticize him.",
  "808s & Heartbreak": "Following the death of his mother due to complications after cosmetic surgery, his relationship with fiancé Alexis Phifer finally ending for good, and a struggle to adapt to his celebrity status, Kanye felt emotionally drained and lost. Kanye dealt with his pain by channeling it into a sonically stripped-down album, one dominated by his use of the titular Roland TR-808 drum machine and Auto-Tune. This album significantly influenced future hip-hop music, having influenced Drake, Future, Travis Scott, and more.",
  "Good Ass Job": "As far back as 2003, Kanye had planned a four-album series revolving around going to college, with Good Ass Job concluding the series. The death of his mother derailed this plan, with his fourth album becoming the somber 808s & Heartbreak. People still expected Good Ass Job to release, though, as Kanye's next album as late as early 2010. When the wake of the 2009 VMAs incident happened, it would cause Good Ass Job not to release. The title seems to have changed to MBDTF around May 2010 or atleast not called GAJ anymore. The cover included for this era is the original cover for the single \"POWER.\"",
  "My Beautiful Dark Twisted Fantasy": "Conceived during West's self-imposed exile following the 2009 VMA incident and further influenced by his deteriorating relationship with model Amber Rose, My Beautiful Dark Twisted Fantasy is a genre-bending masterpiece that explores the darker sides of celebrity, fame, and love. With grand production that sounds like the natural evolution of all the albums that came before it, this is seen by many as Kanye's best album, even earning an extremely rare 10/10 rating from Pitchfork.",
  "Watch The Throne": "Considered one of the most legendary collab albums of all time, Watch The Throne puts together two of the most legendary figures in music history for a full studio album. Kanye teams up with his big brother, JAY-Z, for an album, focused primarily on luxury, black excellence, and the American dream. The album's production also reflects that, and having been recorded by two future billionaires primarily in New York City's Tribeca Grand Hotel, how could it not?",
  "Cruel Summer": "A compilation of new songs from Kanye's label, G.O.O.D. Music, 2012's Cruel Summer is one of the most collaborative Kanye projects he accomplished. Featuring various collaborations with Pusha T, Big Sean, 2 Chainz, John Legend, and many more, this album spawned many big hits, including \"Mercy\" and the remix of the Chief Keef song \"Don't Like.\" This album also marks the first time Kanye would work with Travis Scott, an at-the-time complete unknown with no mixtape to his name.",
  "Thank God For Drugs": "Before Kanye chose the name Yeezus for his sixth solo album, the name was Thank God For Drugs. Recording started in 2012 and accelerated in early 2013, with Kanye and his producers producing material very quickly. The tracklist for the album boasted 20 songs, with around 3.5 hours of rough material created for the album. After changing the album's name to Yeezus, Kanye recruited Rick Rubin to cut down this material and take the music in a minimal direction.",
  "Yeezus": "Yeezus marked a complete reverse from the bombastic production that Kanye accomplished on My Beautiful Dark Twisted Fantasy. He swapped lush soul and anthemic hooks for splintering electro, acid house, and industrial force while packaging some of his most lewd and heart-crushing tales. Initially envisioned as Thank God For Drugs, a much larger project, Kanye would play the album for Rick Rubin, he later recalled listening to roughly 3-hours of unfinished material that seemed to need months worth of work - despite the release date being a month away. Kanye enlisted Rubin to refine and complete the project, finishing a majority of the songs just two days before release.",
  "Cruel Winter [V1]": "The 2013 version of Cruel Winter, the first version of the sequel to 2012's Cruel Summer, is a mystery. No single for this album was released, and most of the info comes from leakers and insiders. It had many songs with A Tribe Called Quest member Q-Tip, who was notably absent from Cruel Summer despite having already been signed to the label. There is no official cover for this album, so we're using a fanmade cover to represent this era.",
  "Yeezus 2": "After Rick Rubin and Kanye West cut down Yeezus to the final ten tracks, Kanye still saw potential in much of the cut material. Thus, shortly after Yeezus was released, an EP of leftovers titled Lost Yeezus was already being teased. The project then evolved into a full-fledged album of mostly new material, with Yeezus 2 acting as a codename before they could choose the last name. This project would develop into So Help Me God as the songs evolved.",
  "So Help Me God": "Announced in February 2015, So Help Me God is now one of Kanye's most infamous unreleased projects. Essentially being a more advanced version of the songs developed during the Yeezus 2 era, So Help Me God gained significant hype as the teaser tracks of \"Wolves,\" \"All Day,\" and \"Only One\" was revealed to the public. Despite intending to release the album in March 2015, Kanye never finished So Help Me God, and only a few songs from the era ended up on The Life Of Pablo.",
  "SWISH": "After changing the name of his 7th solo album from So Help Me God to SWISH, Kanye began to develop all new songs throughout mid-late 2015 meant for the album, with most of them eventually making it onto the final release of The Life Of Pablo. Kanye also continued to work on many So Help Me God and Yeezus 2 tracks, but by the end of 2015 and the start of 2016, Kanye had dropped most of these tracks from the tracklist for SWISH, which began to resemble the final TLOP tracklist strongly.",
  "The Life Of Pablo": "The Life Of Pablo is Kanye's 7th studio album, with constant name changes before release. Sporadic and scatter-shot, the album is one of a kind. The title refers to three people: artist Pablo Picasso, drug dealer Pablo Escobar, and Paul the Apostle, whose name is Pablo in Spanish. The album was initially released only on TIDAL, but later made its way to other streaming services with some updates. Kanye finally finished it by adding the track \"Saint Pablo.\"",
  "Cruel Winter [V2]": "After the 2013 rendition of Cruel Winter ended production, Kanye revived it in 2016. With only one official single released, this album took many ideas from popular music at the time, including many trap elements, remixes, and the biggest music stars. The label supposedly worked on it as late as November 2017, but the album has yet to come. There isn't an official cover for this album we know of, so we are using the single art for \"Champions.\"",
  "Wolves": "Wolves was meant to be a collabaration album between Kanye West & Drake. The project was first mentioned by Ye in an interview in 2015, and billboards would be spotted with the phrase \"Calabasas Is The New Abu Dhabi\" with the OVO and G.O.O.D. Music logos in mid-2016 which hinted the album was coming soon. Drake later even stated the album was finished and up to Kanye to release, but despite this multiple insiders have stated that Wolves was mainly just a session and nothing much came out of it. The cover used for this era is a recreation of the image used on the billboards.",
  "TurboGrafx 16": "Immediately after Kanye released The Life of Pablo, he announced a whole new album titled Turbo Grafx 16, intended to be released in the summer of 2016. Kanye intended to pursue a futuristic sound, wanting to incorporate video game samples into the record. However, work on the album was short-lived, as Kanye began touring in August 2016 and scrapped the concept entirely after being diagnosed as bipolar. The cover included for this era is unofficial, despite being popular among Kanye fans.",
  "LOVE EVERYONE": "After Kanye was released from UCLA Medical Hospital and diagnosed as bipolar, he bought a ranch in Wyoming where he would produce his next album and multiple albums for his collaborators. The concept of the album came together in 2018. The album's subject matter varied wildly, with some songs being about introspection and change and others discussing his political views. The public name given for this album is LOVE EVERYONE, but it is known that Kanye likely considered the Hitler title longer.",
  "ye": "ye discusses topics in Kanye's life, including mental health, family, and addiction. He also explicitly announced his diagnosis of bipolar disorder through the album's artwork and a proclamation within the album. The seven-song project, created in Jackson Hole, Wyoming, was released alongside five other projects. Kanye revealed in an interview that after his infamous TMZ interview (in which he stated that slavery was a choice), he completely re-did his album with an entirely new theme.",
  "KIDSSEEGHOSTS": "Out of the five Wyoming projects from 2018, people consider KIDS SEE GHOSTS one of the best. This album focuses heavily on overcoming struggles caused by mental health, which Kanye and Cudi have been fighting. It's characterized by many psychedelic and rock-influenced elements, making for an album that sounds like nothing else. This album was officially released on June 8th, 2018, making it Kanye's second collab album.",
  "Good Ass Job (2018)": "Kanye and Chance collab project that people talked about for years before being officially announced in 2018. The project was supposed to be just seven tracks long, similar to all the Wyoming albums. The central theme of this project is a celebration, as many of the tracks we've heard from this project seem to be very joyful and uplifting. Kanye and Chance presumably canceled it sometime in 2019. This project has no covers we know of, so we have used unofficial artwork.",
  "Yandhi [V1]": "Upon hearing the beat to \"Hurricane\" during sessions for Good Ass Job (2018), Kanye became inspired to create a whole new album titled Yandhi. With the album's concept in his mind, Kanye and his producers began frenzied work as they developed multiple new songs throughout September 2018, aiming for a September 29 release date. As they did not meet this deadline, Kanye went to Uganda to conduct further work on the album, but delayed it indefinitely on November 13.",
  "Yandhi [V2]": "After Kanye delayed Yandhi indefinitely, he began working with record producer Timbaland to create \"more healing music\" for the album. Shortly after the announcement of the delay, Kanye underwent a sudden and dramatic conversion towards born-again evangelical Christianity, debuting the Sunday Service Choir at the start of 2019. The creation of the choir coincided with the songs on Yandhi taking a new Christian lyrical focus. Eventually, the album would morph into the thoroughly Christian JESUS IS KING by mid-2019.",
  "JESUS IS KING": "Following a revelation on Easter 2019 at Coachella, Kanye scrapped Yandhi and reworked it to focus on God and Christianity. This album ended up being JESUS IS KING. After a private listening party in Detroit, Kim Kardashian announced that the album would release on Sunday, September 29, following listening parties in Chicago and New York. It didn't, and there were no updates for almost a month. On October 20, 2019, Kanye suddenly reappeared on Twitter to announce the final release date.",
  "God's Country": "Shortly after the release of JESUS IS KING, Kanye (almost immediately) started working on new material. Songs from this era revolve around his faith while also consisting of dark themes (such as prison) and lyrics about current social issues. Initially announced as God's Country on May 20th, 2020 by Arthur Jafa, tracks from this album would go on to be developed further in the DONDA [V1] era, following Kanye getting new inspiration to make an album dedicated to his mother.",
  "JESUS IS KING: The Dr. Dre Version": "The release of JESUS IS KING was met with mixed reviews from fans and critics. Kanye then took to Twitter to announce that he was working on a new album with Dr. Dre. Initially conceived as a remix album, it eventually grew to incorporate mainly unreleased material. During the #WESTDAYEVER campaign, Kanye did on Twitter in 2020, it was supposed to release officially, but never did. It ended up being scrapped sometime in 2020, as stated by producer Dem Jointz. Kanye posted the cover in 2022, which is assumed to be for the album.",
  "DONDA [V1]": "With new inspiration to work on an album dedicated to his mother, Kanye continued working on previous demos and new ideas. The music of this era reflects Donda's impact on Kanye in a colorful sound while reflecting his mania and the stress he was going through focusing on his businesses while also running for President. With multiple failed release dates for the album, Kanye went into silence in early 2021, finishing up tracks until the album morphed into something very different.",
  "Donda [V2]": "After taking a break from music in early 2021, Kanye went to work at the Pio Pico studio in LA with an entirely new vision for the album. While the name remained the same, the sound shifted to be more experimental and less soulful. Working with producers such as E.VAX, Dem Jointz, and Digital Nas, Kanye went through hundreds of beats, laying down vocals and trying to come up with ideas for songs. This era would continue until Kanye decided to finalize the album, shifting to the more minimalistic release sound.",
  "Donda [V3]": "Almost a year after the initial announcement of Donda, a Beats by Dre ad revealed that a listening party would take place at the Mercedes-Benz Stadium in Atlanta. It happened, but the album didn't drop. Kanye moved into the stadium and lived there until the second listening event two weeks later. Once again, the album did not release. Ye later announced a third listening party at Soldier Field in Chicago, with the album coming the next day. It didn't. The album ended up releasing on August 29th, 2021 at 8AM EST, almost two days after the final listening party.",
  "Donda 2": "Donda 2 was announced by Ye via Instagram, being executive produced by Future. Ye then proceeded to get into many significant controversies. He hosted a listening party for it in Miami, in which many of the tracks were unfinished. It was released on the Stem Player a few days later, but it was still incomplete. Months later, Ye got into even more controversies, making him get dropped by Adidas, buy the social media Parler, and lose his billionaire status following his proclaiming \"White Lives Matter\" at Yeezy Season 9.",
  "WAR": "A collaborative project between Ye and James Blake. Sessions for the project began around April 2022. On his third Drink Champs interview, Ye referred to these sessions as work for \"their album\". Three songs from the project were played at a party featured on Naomi Campbell's Instagram, with the song \"What I Would Have Said At Virgil's Funeral\" being previewed in full at YZY Season 9 shortly thereafter. The project was presumably scrapped in the wake of Ye's numerous antisemitic comments.",
  "YEBU": "Days before Ye was set to hold YZY Season 9, he suddenly changed plans for the event and wore a \"White Lives Matter\" shirt. After that, Ye tweeted about going \"death con 3\" on Jewish people. Following an interview with Alex Jones in which he proclaimed himself a Nazi and claimed he \"liked Hitler,\" many fans and artists gave up supporting Ye and his antics. Following this and an \"apology\" posted on Instagram, Ye went silent for months and began working on new material in Italy with his frequent collaborators. Reportedly being made at the same time as VULTURES. The cover for this era is from the \"Someday We'll All Be Free\" single.",
  "Bad Bitch Playbook": "Ye and Ty Dolla $ign frequently collaborated during the sessions for YEBU, hinting at a joint project. A snippet featuring Ty was released on October 2nd, 2023, leading to the song \"BACK TO ME\", and confirming a joint album via Instagram. TMZ later reported that Ye was producing both a solo album and a collaborative one with Ty. Then, during the Saudi Arabia recording sessions for Bad Bitch Playbook Vol. 1 in November 2023, the name for the collaborative project between Ty Dolla $ign & Ye would be changed to Vultures, with that coming a sonic change in the project.",
  "VULTURES 1": "After the album's name change from Bad Bitch Playbook Vol. 1 to VULTURES 1, four listening parties were scheduled between December 12th, 2023, and February 9h, 2024. In 2024, Ye announced that VULTURES would be a trilogy, with the first installment dropping on February 9th, followed by the second and third albums in March and April. VULTURES 1 would end up being released on February 10tth, the day after the final listening party.",
  "VULTURES 2": "VULTURES 2 was announced alongside 2 other volumes of VULTURES, and was meant to release on March 8th, 2024, and then May 3rd, 2024. This album would've became the first release exclusive to the YZYAPP. The cover shows Ty Dolla $ign holding a portrait of his brother Big TC, who is currently in prison. After the album failed to drop on May 3rd, 2024, the direction of the project completely shifted, and was to be censored. The album failed to drop August 2nd and then dropped August 3rd with questionable mixing/songs.",
  "VULTURES 3": "Was announced alongside the 2 other volumes and was set to release on April 5th, 2024, however this didn't happen. The project was thought to have been scrapped after the rushed release of VULTURES 2, and Ye's apparent focus on his solo project BULLY. However, Ty stating that \"V3 boutta rip heads off\" in 88-Keys' Instagram Live chat, and Ye heart reacting a fan's message asking if the project still exists, seem to contridict this. The project was set to drop in 2025, however given Ye's recent statements against Ty Dolla $ign, and his signal on twitter that he was working to remove Ty from Melrose, it's assumed that the project is now scrapped. When asked if the album is coming, Ty Dolla $ign responded with \"Six Seven.\"",
  "BULLY [V1]": "On September 3rd, 2024, the CEO of Channel Candy, Ye's new touring company, confirmed that work on a new solo Ye album had began after the South Korea Vultures listening experience. On September 28th, 2024, on the second Haikou listening event, Ye confirmed that the album name is Bully, which references the movie with the same name that he posted on his Instagram story a few days prior to the event. On January 2nd, 2025, Ye announced the album would have AI on it after months of speculation, and that it could help AI become used more in music. After the release of Bully V1, Ye confirms his intention to re-record the AI on Bully, and stated it was being mixed.",
  "CUCK": "On March 6th, 2025, Ye tweeted, \"this next album got that antisemitic sound\" and \"my new sound called antisemitic\". This would mark a shift in Ye's soundscape, as his antisemitic ideas had been mostly contained to his Twitter at that time, besides a few one-off remarks about Jews on the VULTURES albums. On March 16th, 2025, Ye would tweet an image of a red swastika against a black background, declaring it as a \"NEW ALBUM COVER\". On April 2nd. 2025, DJ Akademiks would post a series of Tweets that eventually led to the announcement of a new album titled WW3, separating this project from BULLY.",
  "DONDA 2 (2025)": "After releasing Donda 2 via the Stem Player in 2022, Ye would eventually move onto other projects. However, the project never left his mind, with some songs continuing to be considered in the Vultures era. 2025 would see Ye enter a new era of creative fuel, once again working on multiple projects at once. With plans to release BULLY and CUCK, Ye also spoke of plans to \"officially\" release Donda 2, repeatedly saying he planned to rerecord verses and upload a \"finished\" version of the album.",
  "IN A PERFECT WORLD": "After taking to Twitter in May 2025 to \"denounce\" his antisemitism, Ye would go return to being mostly absent from social media/public eye. Around this same time, he and Bianca would admit themselves into a wellness retreat, with Bianca posting a snippet to her Instagram of Ye in his DROAM-ified home, backed by a new song that suggested a possible return/shift to religious themes once again. In late-June, Ye would announce another album name change to \"In A Perfect World\".",
  "BULLY [V2]": "After leaking the BULLY V1 visual albums on Twitter, Ye would promise to record over all the album's AI vocals. Throughout 2025, Ye would continue working on the album while teasing numerous release dates that would come and go. On June 20th, 2025, three singles would drop for the album, alongside two more dropping the following week; only one of these songs did not contain AI, being the previously unheard \"DAMN\". Later in 2025 into early 2026, YEEZY and its associates would repeatedly claim the album was now fully recorded, and that no AI would be used on its release. The album would finally drop on March 28th, 2026 with YEEZY only being partially truthful as some songs still contained AI, most prominent on the second half of the album.",
  "Ongoing": ""
};

export const FILTER_TOOLTIPS: Record<string, string> = {
  'Snippet': 'Less than a minute of the song is available.',
  'Partial': 'More than a minute of the song is available.',
  'Beat Only': 'Only the instrumental of the song is available.',
  'Tagged': 'Full song is available, but with added tags not from the song itself.',
  'Stem Bounce': 'Full song that has been exported by anyone else who was not the intended person.',
  'Full': 'The entire song is available, but not the original file.',
  'OG File': 'The original entire file of a song is available.',
  'Confirmed': 'The song is unavailable, but has been confirmed to exist by people who have worked with Kanye.',
  'Rumored': 'The song is unavailable, but has been said to exist by reputable people within the leak community. Please take with a grain of salt.',
  'Conflicting Sources': "There have been reputable people who say the song does exist and reputable people who say the song doesn't exist. As it is not our place to say who's right or wrong, songs with conflicting sources will be marked as such.",

  'Not Available': 'Placeholder for unavailable songs.',
  'Recording': 'A non-digital copy is available. Usually live performances or someone playing the song.',
  'Low Quality': 'Anything lower than 128kbps (YouTube quality). Noticeably worse than High Quality or CD Quality.',
  'High Quality': 'Anything greater than or equal to 128kbps (YouTube quality) and less than 320kbps.',
  'CD Quality': 'Anything around 320kbps. Not a noticeable difference to Lossless quality.',
  'Lossless': 'Raw audio data, usually from leaked stems or sessions. Useful for audio editing, but not noticeably different to CD Quality.'
};

export const createSlug = (name: string) => encodeURIComponent(
  name
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
);

export function getSongSlug(song: any, allSongsInCollection: any[]): string {
  if (!song || !song.name) return 'NoName1';
  
  if (song.name.includes('???') || createSlug(song.name) === '') {
    let index = 1;
    const targetUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
    for (const s of allSongsInCollection) {
      if ((s.name && s.name.includes('???')) || createSlug(s.name) === '') {
        const sUrl = s.url || (s.urls && s.urls.length > 0 ? s.urls[0] : '');
        if (s.name === song.name && sUrl === targetUrl && s.description === song.description) {
          return `NoName${index}`;
        }
        index++;
      }
    }
    return `NoName1`;
  }
  return createSlug(song.name) || 'NoName1';
}

export function getArtistName(eraName: string | undefined): string {
  if (!eraName) return "Kanye West";
  const albumNames = Object.keys(ALBUM_RELEASE_DATES);
  const donda3Index = albumNames.indexOf("Donda [V3]");
  const eraIndex = albumNames.indexOf(eraName);

  if (donda3Index !== -1 && eraIndex !== -1 && eraIndex > donda3Index) {
    return "YE";
  }
  return "Kanye West";
}

export const TAG_MAP: Record<string, string> = {
  '⭐': 'Best Of',
  '🏆': 'Grails',
  '🥇': 'Wanted',
  '🏅': 'Wanted',
  '✨': 'Special',
  '💛': 'By YƵYGOLD',
  '🗑️': 'Worst Of',
  '🗑': 'Worst Of',
  '🚮': 'Unwanted',
  '🤖': 'AI',
  '⁉️': 'Lost Media',
  '⁉': 'Lost Media',
  '❓': 'Unknown'
};

export function formatTextForNotification(text: string | undefined | null, tagsAsEmojis: boolean): string {
  if (!text) return '';
  let formattedText = text;
  const tags: string[] = [];

  Object.entries(TAG_MAP).forEach(([emoji, tag]) => {
    if (formattedText.includes(emoji)) {
      if (!tagsAsEmojis) {
        tags.push(`[${tag.toUpperCase()}]`);
      }
      formattedText = formattedText.split(emoji).join('').trim();
    }
  });

  formattedText = formattedText.replace(/[\uFE0F]/g, '').trim();

  if (tagsAsEmojis) {
    return text;
  }

  if (tags.length === 0) {
    return formattedText;
  }

  return `${formattedText} ${tags.join(' ')}`.trim();
}

export function formatTextWithTags(text: string | undefined | null) {
  if (!text) return null;

  let formattedText = text;
  const tags: { emoji: string, tag: string }[] = [];

  Object.entries(TAG_MAP).forEach(([emoji, tag]) => {
    if (formattedText.includes(emoji)) {
      tags.push({ emoji, tag });
      formattedText = formattedText.split(emoji).join('').trim();
    }
  });

  formattedText = formattedText.replace(/[\uFE0F]/g, '').trim();

  if (tags.length === 0) {
    return <>{formattedText}</>;
  }

  return <FormattedTextWithTags tags={tags} formattedText={formattedText} />;
}

function TagComponent({ t, tagsAsEmojis }: { t: { emoji: string, tag: string }, tagsAsEmojis: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const tooltipText = TAG_TOOLTIP_MAP[t.tag];

  const updateRect = () => {
    if (tagRef.current) {
      setRect(tagRef.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (isHovered) {
      updateRect();
      window.addEventListener('scroll', updateRect, true);
      window.addEventListener('resize', updateRect);
      return () => {
        window.removeEventListener('scroll', updateRect, true);
        window.removeEventListener('resize', updateRect);
      };
    }
  }, [isHovered]);

  useEffect(() => {
    if (isHovered) {
      const handleDocClick = (e: MouseEvent) => {
        if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
          setIsHovered(false);
        }
      };
      const timer = setTimeout(() => {
        document.addEventListener('click', handleDocClick);
        document.addEventListener('touchstart', handleDocClick);
      }, 10);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleDocClick);
        document.removeEventListener('touchstart', handleDocClick);
      };
    }
  }, [isHovered]);

  return (
    <div 
      ref={tagRef}
      className="relative flex items-center shrink-0 cursor-help"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsHovered(!isHovered);
      }}
    >
      {tagsAsEmojis ? (
        <span className="shrink-0 flex items-center justify-center text-sm">{t.emoji}</span>
      ) : (
        <span className="shrink-0 flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 bg-[var(--theme-color)]/10 text-[var(--theme-color)] font-bold">
          {t.tag}
        </span>
      )}

      {tooltipText && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isHovered && rect && (
            <motion.div
              initial={{ opacity: 0, x: "-50%", y: "calc(-100% + 5px)", filter: 'blur(4px)', scale: 0.95 }}
              animate={{ opacity: 1, x: "-50%", y: "-100%", filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, x: "-50%", y: "calc(-100% + 5px)", filter: 'blur(4px)', scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{
                position: 'fixed',
                left: rect.left + rect.width / 2,
                top: rect.top - 8,
                zIndex: 99999,
                transformOrigin: 'bottom center'
              }}
              className="w-48 sm:w-64 p-3 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl pointer-events-none"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-base flex items-center justify-center text-[var(--theme-color)]">{t.emoji}</span>
                  <span className="font-bold text-white text-xs">{t.tag}</span>
                </div>
                <p className="text-white/70 text-[11px] leading-snug whitespace-normal line-clamp-3">
                  {tooltipText}
                </p>
              </div>
              <div className="absolute top-full left-1/2 -ml-1.5 -mt-[1px] border-solid border-t-neutral-900 border-x-transparent border-b-transparent border-[6px]" />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function FormattedTextWithTags({ tags, formattedText }: { tags: { emoji: string, tag: string }[], formattedText: string }) {
  const { settings } = useSettings();
  
  return (
    <div className="flex items-center gap-1.5 truncate">
      <span className="truncate">{formattedText}</span>
      {tags.map((t, i) => (
        <TagComponent key={i} t={t} tagsAsEmojis={settings.tagsAsEmojis} />
      ))}
    </div>
  );
}

export function getCleanSongNameWithTags(text: string | undefined | null): string {
  if (!text) return '';
  let formattedText = text;
  const tags: string[] = [];

  Object.entries(TAG_MAP).forEach(([emoji, tag]) => {
    if (formattedText.includes(emoji)) {
      tags.push(tag);
      formattedText = formattedText.split(emoji).join('').trim();
    }
  });

  formattedText = formattedText.replace(/[\uFE0F]/g, '').trim();

  if (tags.length > 0) {
    return `${formattedText} [${tags.join(', ')}]`;
  }
  return formattedText;
}

export async function handleDownloadFile(url: string, suggestedName: string, tagsAsEmojis: boolean) {
  if (!url) return;
  try {
    let finalUrl = url;
    let fileName = suggestedName;
    if (!tagsAsEmojis) {
      fileName = formatTextForNotification(suggestedName, false);
    }
    
    let isImage = false;
    let ext = '.mp3';

    if (url.includes('pillows.su/f/') || url.includes('temp.imgur.gg/f/')) {
        const hash = url.split('/f/')[1]?.split('/')[0]?.split('?')[0];
        if (hash) {
            finalUrl = `https://api.pillows.su/api/get/${hash}`; 
        }
    } else if (url.includes('ibb.co')) {
       isImage = true;
       ext = '';
       const apiRes = await fetch(`https://imgbb-file-get-api.vercel.app/api?url=${url}`).catch(() => null);
       if (apiRes && apiRes.ok) {
           const apiData = await apiRes.json().catch(() => null);
           if (apiData && apiData.direct_link) {
               finalUrl = apiData.direct_link;
           }
       }
    } else if (url.match(/\.(png|jpg|jpeg)$/i) || url.startsWith('https://i.scdn.co/')) {
        isImage = true;
        const match = url.match(/\.(png|jpg|jpeg)$/i);
        ext = match ? match[0] : '.png';
    } 

    if (!fileName.endsWith('.mp3') && !isImage) {
        fileName += ext;
    } else if (isImage && !fileName.match(/\.(png|jpg|jpeg)$/i)) {
        fileName += ext;
    }

    let blob: Blob;
    try {
      const getWithTimeout = async (requestUrl: string, timeoutMs: number) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(requestUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          return res;
        } catch (err) {
          clearTimeout(timeoutId);
          return null;
        }
      };

      let response = await getWithTimeout(finalUrl, 3000);
      
      if (!response || !response.ok) {
        if (isImage) {
          const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(finalUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(finalUrl)}`
          ];
          
          for (const proxy of proxies) {
            response = await getWithTimeout(proxy, 4000);
            if (response && response.ok) break;
          }
          
          if (!response || !response.ok) {
             throw new Error("All proxies failed");
          }
        } else {
          throw new Error("Network error");
        }
      }
      blob = await response.blob();
    } catch (e) {
      console.error('Download failed:', e);
      window.open(url, '_blank');
      return;
    }

    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch (e) {
    console.error('Download failed:', e);
    window.open(url, '_blank');
  }
}

export function isSongNotAvailable(song: any, rawUrl: string): boolean {
  if (song.quality?.toLowerCase() === 'not available') return true;
  if (!rawUrl) return false;
  const lowerUrl = rawUrl.toLowerCase().trim();
  return lowerUrl.includes('link needed') || lowerUrl.includes('link%20needed') || lowerUrl.includes('source needed') || lowerUrl.includes('source%20needed') || lowerUrl === 'n/a';
}

export function parseDurationToSeconds(duration: string | undefined): number {
  if (!duration) return 0;

  if (!duration.includes(':')) {
    const num = Number(duration);
    return isNaN(num) ? 0 : num;
  }

  const parts = duration.split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  } else if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}

export function matchesFilters(song: any, searchQuery: string, filters: any): boolean {
  const lowerQuery = searchQuery.toLowerCase();
  const searchMatch = !searchQuery ||
    song.name.toLowerCase().includes(lowerQuery) ||
    (song.extra && song.extra.toLowerCase().includes(lowerQuery)) ||
    (song.description && song.description.toLowerCase().includes(lowerQuery));

  if (!searchMatch) return false;

  if (filters.tags && filters.tags.length > 0) {
    const hasAllTags = filters.tags.every((tagEmoji: string) => {
      return (song.name && song.name.includes(tagEmoji)) ||
        (song.extra && song.extra.includes(tagEmoji)) ||
        (song.fakesType && song.fakesType.toLowerCase().includes(tagEmoji.toLowerCase()));
    });

    if (!hasAllTags) {
      return false;
    }
  }

  if (filters.excludedTags && filters.excludedTags.length > 0) {
    const hasExcludedTag = filters.excludedTags.some((tagEmoji: string) => {
      return (song.name && song.name.includes(tagEmoji)) ||
        (song.extra && song.extra.includes(tagEmoji)) ||
        (song.fakesType && song.fakesType.toLowerCase().includes(tagEmoji.toLowerCase()));
    });
    if (hasExcludedTag) {
      return false;
    }
  }

  if (filters.qualities && filters.qualities.length > 0) {
    const hasAnyQuality = filters.qualities.some((quality: string) => {
      return (song.quality && song.quality.toLowerCase().includes(quality.toLowerCase())) ||
             (song.fakesLength && song.fakesLength.toLowerCase().includes(quality.toLowerCase()));
    });
    if (!hasAnyQuality) {
      return false;
    }
  }

  if (filters.excludedQualities && filters.excludedQualities.length > 0) {
    const hasExcludedQuality = filters.excludedQualities.some((quality: string) => {
      return (song.quality && song.quality.toLowerCase().includes(quality.toLowerCase())) ||
             (song.fakesLength && song.fakesLength.toLowerCase().includes(quality.toLowerCase()));
    });
    if (hasExcludedQuality) {
      return false;
    }
  }

  if (filters.availableLengths && filters.availableLengths.length > 0) {
    const hasAnyLength = filters.availableLengths.some((len: string) => {
      return song.available_length && song.available_length.toLowerCase().includes(len.toLowerCase());
    });
    if (!hasAnyLength) {
      return false;
    }
  }

  if (filters.excludedAvailableLengths && filters.excludedAvailableLengths.length > 0) {
    const hasExcludedLength = filters.excludedAvailableLengths.some((len: string) => {
      return song.available_length && song.available_length.toLowerCase().includes(len.toLowerCase());
    });
    if (hasExcludedLength) {
      return false;
    }
  }

  if (filters.durationValue && filters.durationValue.trim() !== '') {
    const songSeconds = parseDurationToSeconds(song.track_length);
    if (!songSeconds) return false;

    let targetSeconds = 0;
    if (!filters.durationValue.includes(':')) {
      const raw = Number(filters.durationValue);
      targetSeconds = !isNaN(raw) ? raw * 60 : 0;
    } else {
      targetSeconds = parseDurationToSeconds(filters.durationValue);
    }

    if (filters.durationOp === '>') {
      if (songSeconds <= targetSeconds) return false;
    } else if (filters.durationOp === '<') {
      if (songSeconds >= targetSeconds) return false;
    } else if (filters.durationOp === '=') {
      if (songSeconds !== targetSeconds) return false;
    }
  }

  if (filters.playableOnly) {
    const rawUrl = song.url || (song.urls && song.urls.length > 0 ? song.urls[0] : '');
    const isNotAvailable = song.quality?.toLowerCase() === 'not available';
    if (!rawUrl || !rawUrl.includes('pillows.su/f/') || isNotAvailable) {
      return false;
    }
  }

  if (filters.albums && filters.albums.length > 0) {
    const hasAnyAlbum = filters.albums.some((album: string) => {
      const songAlbum = song.extra2 || song.realEra?.name || song.extra;
      return songAlbum && songAlbum.toLowerCase() === album.toLowerCase();
    });
    if (!hasAnyAlbum) {
      return false;
    }
  }


  return true;
}
