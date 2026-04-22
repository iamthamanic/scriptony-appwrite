/**
 * 🎬 SEED FILM TIMELINE DATA
 * Erstellt Test-Daten für das Film Timeline Interface
 *
 * NOTE: Currently uses mock data. Uncomment apiClient calls when server is deployed.
 */

// import { apiClient } from '../lib/api-client';

export async function seedFilmTimeline(projectId: string) {
  try {
    console.log("🎬 Seeding film timeline...");

    // Create 3 Acts
    const acts = [];
    const actColors = ["#00CCC0", "#98E5B4", "#FFB4C8"];
    const actTitles = ["Setup", "Confrontation", "Resolution"];

    // TODO: Uncomment when server is deployed
    // for (let i = 0; i < 3; i++) {
    //   const act = await apiClient.post('/acts', {
    //     project_id: projectId,
    //     act_number: i + 1,
    //     title: actTitles[i],
    //     description: `Act ${i + 1} - ${actTitles[i]}`,
    //     color: actColors[i],
    //   });
    //   acts.push(act);
    //   console.log(`✅ Created Act ${i + 1}`);
    // }

    console.log(
      "⚠️ Mock mode: Acts and scenes would be created here when server is deployed",
    );

    // Create sample scenes for each act
    const sceneTemplates = [
      // Act 1 scenes
      [
        {
          title: "Opening Shot",
          location: "City Street",
          time_of_day: "Morning",
        },
        {
          title: "Meet the Protagonist",
          location: "Coffee Shop",
          time_of_day: "Morning",
        },
        {
          title: "Inciting Incident",
          location: "Office",
          time_of_day: "Afternoon",
        },
      ],
      // Act 2 scenes
      [
        {
          title: "First Challenge",
          location: "Downtown",
          time_of_day: "Evening",
        },
        {
          title: "Midpoint Twist",
          location: "Abandoned Warehouse",
          time_of_day: "Night",
        },
        { title: "All Is Lost", location: "Rooftop", time_of_day: "Night" },
      ],
      // Act 3 scenes
      [
        {
          title: "Final Confrontation",
          location: "City Hall",
          time_of_day: "Dawn",
        },
        { title: "Resolution", location: "Park", time_of_day: "Morning" },
        { title: "Epilogue", location: "Coffee Shop", time_of_day: "Morning" },
      ],
    ];

    // TODO: Uncomment when server is deployed
    // for (let actIndex = 0; actIndex < acts.length; actIndex++) {
    //   const act = acts[actIndex];
    //   const templates = sceneTemplates[actIndex];
    //   for (let sceneIndex = 0; sceneIndex < templates.length; sceneIndex++) {
    //     const template = templates[sceneIndex];
    //     const sceneNumber = `${actIndex + 1}.${sceneIndex + 1}`;
    //     await apiClient.post('/scenes', {
    //       project_id: projectId,
    //       act_id: act.id,
    //       scene_number: sceneNumber,
    //       title: template.title,
    //       location: template.location,
    //       time_of_day: template.time_of_day,
    //       description: `Scene ${sceneNumber} - ${template.title}`,
    //       order_index: sceneIndex,
    //     });
    //     console.log(`✅ Created Scene ${sceneNumber}: ${template.title}`);
    //   }
    // }

    console.log("🎉 Film timeline seeded successfully!");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Error seeding film timeline:", error);
    return { success: false, error: error.message };
  }
}

// Helper function to call from console
(window as any).seedFilmTimeline = seedFilmTimeline;
