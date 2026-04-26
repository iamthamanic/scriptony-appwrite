Now I have a complete picture. Here's the T12 audit:                                    
                                                                                          
  T12 scriptony-editor-readmodel bauen — Audit-Ergebnis                                   
                                                                                          
  Akzeptanzkriterien-Check                                                                
                                                                                          
  Kriterium: GET /editor/projects/:projectId/state funktioniert                           
  Status: ✅                                                                           
  Detail: Route existiert, Handler aggregiert korrekt                                     
  ────────────────────────────────────────                                             
  Kriterium: Function ist read-only                                                       
  Status: ✅                                                                              
  Detail: Keine createDocument/updateDocument/deleteDocument-Aufrufe im Code (nur
    JSDoc-Kommentar erwähnt "Verboten"). Imports sind listDocumentsFull, Query,           
    requestGraphql, requireProjectAccess — alles lesend
  ────────────────────────────────────────                                                
  Kriterium: Keine Provider Calls                                                         
  Status: ✅
  Detail: Keine OpenAI/Anthropic/etc.-Imports. Kein ai-service-Import                     
  ────────────────────────────────────────
  Kriterium: Keine Job-Erstellung                                                         
  Status: ✅
  Detail: Keine Job-Referenzen                                                            
  ────────────────────────────────────────
  Kriterium: Permissions respektiert                                                      
  Status: ✅
  Detail: requireUserBootstrap + requireProjectAccess vor jeder Datenabfrage              
  ────────────────────────────────────────
  Kriterium: ultra-batch-load wird nicht mehr erweitert                                   
  Status: ⚠️ 
  Detail: ultra-batch-load existiert unberührt in scriptony-project-nodes — kein          
    Deprecation-Hinweis, kein 410 Gone, kein Kommentar. Das Ticket sagt "wird nicht mehr
    erweitert", nicht "wird entfernt", also akzeptabel, aber die fehlende Doku ist eine
    Lücke
  ────────────────────────────────────────
  Kriterium: lite-Query-Parameter                                                         
  Status: ✅
  Detail: ?lite=true liefert nur Project + Nodes; ?lite=false (default) liefert alles     
  inkl.           
    Assets/Tracks/Style
  ────────────────────────────────────────
  Kriterium: Response-Größe überwacht                                                     
  Status: ✅
  Detail: warning-Feld bei >200 Nodes: "Large project: consider lite=true for faster      
  loads"          
  ────────────────────────────────────────
  Kriterium: Performance-Messung                                                          
  Status: ✅
  Detail: elapsedMs in meta-Feld                                                          
                  
  KISS/SOLID/DRY-Analyse                                                                  
  
  KISS — Sehr sauber. 2 Dateien, 1 Route, klare lite/full-Verzweigung. Lokale             
  Helper-Funktionen (getScriptBlocksForProject, getSceneAudioTracksForProject,
  getAssetsForProject, getStyleForProject) sind fachlich begründet (Cross-Domain-Reads,   
  die nirgendwoanders als Helper existieren).

  SOLID — SRP erfüllt: Read-Model aggregiert, schreibt nicht. DIP: Nutzt                  
  _shared/timeline-Mapper und _shared/appwrite-db + _shared/graphql-compat — keine
  direkten Abhängigkeiten zu Domain-Services.                                             
                  
  DRY — mapNode, mapCharacter, mapShot kommen aus _shared/timeline; mapClip aus           
  _shared/clips-map. Keine lokale Duplikation. Die 4 lokalen Helper
  (getScriptBlocksForProject, getSceneAudioTracksForProject, getAssetsForProject,         
  getStyleForProject) könnten man theoretisch in _shared auslagern, aber da sie
  spezifische Cross-Domain-Queries sind, die nur hier gebraucht werden, ist die lokale
  Platzierung KISS-konform.

  Offene Punkte                                                                           
  
  1. Kein T12 Done Report. Die Datei docs/architecture-refactor-done-reports.md enthält   
  keinen Eintrag für T12. Der Ticket-Marker ARCH-REF-T12-DONE fehlt. Das sollte nachgeholt
   werden.                                                                                
  2. ultra-batch-load hat keinen Deprecation-Hinweis. Das Ticket sagt "wird nicht mehr
  erweitert", nicht "wird entfernt". Das ist OK, aber ein JSDoc-Kommentar wie @deprecated 
  Use GET /editor/projects/:projectId/state from scriptony-editor-readmodel wäre
  hilfreich. Der Frontend-Code (timeline-api-v2.ts) nutzt weiterhin ultra-batch-load      
  direkt — keine Migration auf den neuen Endpunkt erfolgt.
  3. Kein Frontend-Integration. api-gateway.ts und der gesamte src/-Code haben keine
  Referenz auf editor-readmodel oder /editor/projects/:projectId/state. Der Endpunkt      
  existiert im Backend, wird aber vom Frontend noch nicht aufgerufen.
  4. Keine Package.json / Build-Konfiguration. Das Verzeichnis hat nur index.ts und       
  routes/editor-state.ts — keine package.json, tsconfig.json oder appwrite.json. Das      
  deutet darauf hin, dass die Function noch nicht deployed wurde.
                                                                                          
  Ergebnis: T12 ist architekturell korrekt umgesetzt (read-only, KISS, SOLID, DRY). Die   
  Funktion existiert und erfüllt alle fachlichen Akzeptanzkriterien. Es fehlen jedoch: (1)
   der Done Report, (2) ein Deprecation-Hinweis auf ultra-batch-load, (3) die             
  Frontend-Integration, und (4) die Build/Deploy-Konfiguration.