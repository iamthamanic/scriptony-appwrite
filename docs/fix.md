T08 + T09 Korrigierter Audit (gegen echten Code)                                        
                                                                                          
  T08 — Korrekturen zum vorigen Audit                                                     
                                                                                          
  Die drei Haupt-Befunde aus dem letzten Audit sind behoben:                              
                                                                                          
  ┌──────────────────────────────┬────────────────────────────────────────────────────┐   
  │      Vorheriger Befund       │                 Korrigierter Stand                 │
  ├──────────────────────────────┼────────────────────────────────────────────────────┤
  │ Voice Discovery lokal        │ Falsch — Konstante entfernt,                       │
  │ dupliziert (TTS_VOICES)      │ listTTSAvailableVoices returnt jetzt 501 mit       │
  │                              │ Verweis auf scriptony-audio                        │   
  ├──────────────────────────────┼────────────────────────────────────────────────────┤
  │ getJob ohne                  │ Falsch — audio-production.ts:391-402 parsed        │   
  │ Projekt-Zugriffscheck        │ payload_json und prüft canReadProject              │
  ├──────────────────────────────┼────────────────────────────────────────────────────┤   
  │ job-service.ts               │ Falsch — getDocument jetzt statisch importiert     │
  │ inkonsistenter Import        │ (Zeile 15)                                         │   
  └──────────────────────────────┴────────────────────────────────────────────────────┘
                                                                                          
  T08 Akzeptanzkriterien — final                                                          
  
  ┌─────┬────────────────────────────────────┬────────────────────────────────────────┐   
  │  #  │             Kriterium             │                 Status                  │
  ├─────┼───────────────────────────────────┼─────────────────────────────────────────┤   
  │ 1   │ Reads script_blocks, kopiert sie  │ MET                                     │
  │     │ nicht als SoT                     │                                         │   
  ├─────┼───────────────────────────────────┼─────────────────────────────────────────┤   
  │ 2   │ TTS über scriptony-audio          │ PARTIALLY MET — Job erstellt, Worker    │   
  │     │                                   │ fehlt (T15)                             │   
  ├─────┼───────────────────────────────────┼─────────────────────────────────────────┤   
  │ 3   │ Dateien über scriptony-assets     │ PARTIALLY MET — Vertrag dokumentiert,   │
  │     │                                   │ Code fehlt (T15)                        │   
  ├─────┼───────────────────────────────────┼─────────────────────────────────────────┤
  │ 4   │ Mix/Export erzeugt Job, nicht     │ MET                                     │   
  │     │ Fake                              │                                         │   
  ├─────┼───────────────────────────────────┼─────────────────────────────────────────┤
  │ 5   │ Job-Payload = Referenz            │ MET                                     │   
  ├─────┼───────────────────────────────────┼─────────────────────────────────────────┤
  │ 6   │ Snapshot in job_snapshots, Jobs < │ MET                                     │   
  │     │  100KB                            │                                         │
  ├─────┼───────────────────────────────────┼─────────────────────────────────────────┤   
  │ 7   │ Voice Discovery nicht dupliziert  │ MET — 501 mit Delegations-Hinweis       │   
  ├─────┼───────────────────────────────────┼─────────────────────────────────────────┤
  │ 8   │ Keine UI-Aenderung                │ MET                                     │   
  ├─────┼───────────────────────────────────┼─────────────────────────────────────────┤   
  │ 9   │ Shimwrappercheck                  │ MET                                     │
  └─────┴───────────────────────────────────┴─────────────────────────────────────────┘   
                  
  T08 KISS/SOLID/DRY — verbleibende Issues                                                
                  
  1. Mittel: getAudioProductionJob-Returntyp falsch                                       
                  
  job-service.ts:46-50 definiert CreatedJob mit nur { id, status, created_at }. Aber      
  audio-production.ts:394 greift auf payload_json zu via (job as Record<string, 
  unknown>).payload_json. Der Cast umgeht TypeScript — CreatedJob hat gar kein            
  payload_json-Feld. Die Funktion gibt tatsächlich das gesamte Dokument zurück, aber der
  Typ behauptet etwas anderes.

  Fix: Entweder CreatedJob um payload_json?: string erweitern, oder einen eigenen         
  JobWithPayload-Typ für getJob einführen.
                                                                                          
  2. Klein: getJob — canReadProject-Fallback stillschweigend                              
  
  audio-production.ts:403-404: Wenn payload_json fehlt oder ungültig ist, wird ohne       
  Projekt-Check weitergemacht. Ein Job ohne project_id im Payload wäre für jeden
  authentifizierten User lesbar.                                                          
                  
  3. Klein: mixing.ts vs. audio-production.ts — Überlappung                               
  
  mixing.ts returnt 501 für Preview/Export. audio-production.ts hat die echte             
  Implementierung. Mixing ist effektiv Dead Code, wird aber noch geroutet
  (appwrite-entry.ts:69-72).                                                              
                  
  4. Info: T08-2 und T08-3 — PARTIALLY MET ist korrekt                                    
  
  TTS-Ausführung und Asset-Verlinkung hängen am Media Worker (T15). Das ist kein          
  T08-Fehler — der Architektur-Hinweis im Ticket sagt explizit: "Die echten Arbeitsobjekte
   liegen in ihren eigenen Domains."                                                      
                  
  ---
  T09 Akzeptanzkriterien — final
                                                                                          
  ┌─────┬─────────────────────────────┬───────────────────────────────────────────────┐
  │  #  │          Kriterium          │                    Status                     │   
  ├─────┼─────────────────────────────┼───────────────────────────────────────────────┤   
  │ 1   │ TTS funktioniert            │ MET                                           │   
  │     │ unveraendert                │                                               │   
  ├─────┼─────────────────────────────┼───────────────────────────────────────────────┤   
  │ 2   │ STT funktioniert            │ MET                                           │   
  │     │ unveraendert                │                                               │   
  ├─────┼─────────────────────────────┼───────────────────────────────────────────────┤   
  │ 3   │ Voice Discovery über        │ MET — listTTSAvailableVoices in audio-story   │
  │     │ scriptony-audio             │ returnt 501 mit Verweis                       │   
  ├─────┼─────────────────────────────┼───────────────────────────────────────────────┤
  │ 4   │ Shot-Audio-Routen als       │ MET — JSDoc auf allen 4 Dateien + index.ts    │
  │     │ legacy dokumentiert         │                                               │   
  ├─────┼─────────────────────────────┼───────────────────────────────────────────────┤
  │     │ Neue Shot-Audio-Uploads     │ MET (Modell) — owner_type: "shot",            │   
  │ 5   │ über scriptony-assets       │ media_type: "audio" unterstützt               │   
  │     │ abbildbar                   │                                               │   
  ├─────┼─────────────────────────────┼───────────────────────────────────────────────┤   
  │     │ shot_audio Schema-Mismatch  │ PARTIALLY MET — Done Report nennt             │   
  │ 6   │ dokumentiert                │ Parallelexistenz, aber Appwrite vs.           │
  │     │                             │ GraphQL-Feld-Differenz nicht dokumentiert     │
  ├─────┼─────────────────────────────┼───────────────────────────────────────────────┤
  │ 7   │ Shot-Audio UI bleibt        │ MET                                           │
  │     │ nutzbar                     │                                               │   
  ├─────┼─────────────────────────────┼───────────────────────────────────────────────┤
  │ 8   │ Shimwrappercheck            │ MET                                           │   
  └─────┴─────────────────────────────┴───────────────────────────────────────────────┘   
  
  T09 Schema-Mismatch — was genau fehlt                                                   
                  
  Appwrite-Schema (provision-appwrite-schema.mjs): shot_id, file_name, file_size,         
  bucket_file_id, mime_type, duration_ms, user_id, storage_path
                                                                                          
  GraphQL-Schema (in Route-Handlers genutzt): file_url, start_time, end_time, fade_in,    
  fade_out, waveform_data, audio_duration
                                                                                          
  Die beiden Schemas haben fast keine gemeinsamen Felder. Das ist ein signifikanter       
  Mismatch, der nur als "Collection existiert parallel zu assets" dokumentiert ist — die
  inhaltliche Diskrepanz fehlt.                                                           
                  
  T09 KISS/SOLID/DRY — verbleibende Issues                                                
  
  1. Mittel: Shot-Audio-Routen schreiben direkt in shot_audio statt scriptony-assets      
                  
  Die LEGACY-Routen nutzen GraphQL-Mutations direkt gegen shot_audio. Kein                
  Compatibility-Wrapper über scriptony-assets. T09-Akzeptanzkriterium 5 sagt "Neue
  Shot-Audio-Uploads koennen ueber scriptony-assets abgebildet werden" — das ist als      
  Möglichkeit formuliert, nicht als Pflicht. Aber die bestehenden Routen müssten
  mindestens auf scriptony-assets delegieren, um die Domain Map zu erfüllen.

  2. Klein: index.js Bundle-Artefakt — wie bei T07                                        
  
  ---                                                                                     
  Zusammenfassung 
                 
  ┌────────┬─────┬───────────────────┬─────┬─────────────────────────────────────────┐ 
  │        │     │                   │ NOT │                                         │    
  │ Ticket │ MET │   PARTIALLY MET   │     │              Offene Issues              │ 
  │        │     │                   │ MET │                                         │    
  ├────────┼─────┼───────────────────┼─────┼─────────────────────────────────────────┤ 
  │        │     │ 2 (TTS/Assets —   │     │ Typ-Sicherheitslücke in                 │    
  │ T08    │ 7   │ hängen an T15)    │ 0   │ getAudioProductionJob, mixing.ts Dead   │ 
  │        │     │                   │     │ Code                                    │    
  ├────────┼─────┼───────────────────┼─────┼─────────────────────────────────────────┤
  │        │     │ 1                 │     │ Appwrite-vs-GraphQL-Feld-Differenz      │    
  │ T09    │ 6   │ (Schema-Mismatch  │ 0   │ nicht dokumentiert, keine Delegation an │
  │        │     │ unvollständig)    │     │  scriptony-assets                       │    
  └────────┴─────┴───────────────────┴─────┴─────────────────────────────────────────┘

  Beide Tickets sind substantiell korrekt umgesetzt. T08 hat eine saubere                 
  Orchestration-Architektur mit Snapshots, Job-Referenzen und Access-Checks. T09 hat alle
  Routes korrekt als LEGACY markiert und die Voice-Delegation an scriptony-audio          
  implementiert. Die offenen Punkte sind Typ-Sicherheit, Schema-Mismatch-Doku und die noch
   fehlende Bridge zu scriptony-assets.