/**
 * Port: training recommendations.
 * Location: src/modules/creative-gym/domain/ports/recommendation-port.ts
 */

import type { RecommendationInput, TrainingRecommendation } from "../types";

export interface RecommendationPort {
  getRecommendations(input: RecommendationInput): Promise<TrainingRecommendation[]>;
}
