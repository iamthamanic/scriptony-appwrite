/**
 * Creative Gym — entry page (thin shell; module lives under src/modules/creative-gym).
 * Location: src/components/pages/CreativeGymPage.tsx
 */

import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "../../hooks/useRouter";
import { CreativeGymAppWithProvider } from "../../modules/creative-gym";

export function CreativeGymPage() {
  const { user } = useAuth();
  const { state, navigate } = useRouter();

  if (!user) {
    return null;
  }

  return (
    <CreativeGymAppWithProvider
      userId={user.id}
      gymUser={{
        name: user.name ?? "",
        email: user.email ?? "",
        avatar: user.avatar,
      }}
      segment={state.id}
      subSegment={state.categoryId}
      navigate={navigate}
    />
  );
}
