                  <div className="text-xs text-muted-foreground">
                    Erstellt: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unbekannt'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    User: {project.user_id || 'Unbekannt'}
                  </div>
