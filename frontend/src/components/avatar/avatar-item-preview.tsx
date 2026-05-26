/**
 * Small 2D SVG preview for avatar shop cards. Mirrors voxels.ts visually
 * at a glance -- not pixel-perfect.
 */

interface AvatarItemPreviewProps {
  id: string;
}

export function AvatarItemPreview({ id }: AvatarItemPreviewProps) {
  switch (id) {
    case "avatar-hair-short":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="13" rx="9" ry="7" fill="#e8b89a" />
          <path d="M11 13 Q11 6 20 6 Q29 6 29 13 L29 11 L11 11 Z" fill="#6b4422" />
        </svg>
      );
    case "avatar-hair-bald":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="14" rx="9" ry="8" fill="#e8b89a" />
        </svg>
      );
    case "avatar-hair-long":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="13" rx="9" ry="7" fill="#e8b89a" />
          <path d="M11 8 Q11 4 20 4 Q29 4 29 8 L29 23 L25 23 L25 14 L15 14 L15 23 L11 23 Z" fill="#f5d272" />
        </svg>
      );
    case "avatar-hair-curly":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="14" rx="9" ry="7" fill="#e8b89a" />
          <circle cx="13" cy="9" r="3" fill="#c94335" />
          <circle cx="18" cy="6" r="3" fill="#c94335" />
          <circle cx="23" cy="6" r="3" fill="#c94335" />
          <circle cx="28" cy="9" r="3" fill="#c94335" />
        </svg>
      );
    case "avatar-hair-bun":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="14" rx="9" ry="7" fill="#e8b89a" />
          <path d="M11 10 Q11 6 20 6 Q29 6 29 10 L29 11 L11 11 Z" fill="#6b4422" />
          <circle cx="20" cy="4" r="3" fill="#6b4422" />
        </svg>
      );
    case "avatar-hair-mohawk":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="14" rx="9" ry="7" fill="#e8b89a" />
          <rect x="17" y="2" width="6" height="7" fill="#ff7a5c" />
        </svg>
      );

    case "avatar-face-smile":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <circle cx="16" cy="12" r="1.2" fill="#111" />
          <circle cx="24" cy="12" r="1.2" fill="#111" />
          <path d="M16 17 Q20 19 24 17" stroke="#ff7a5c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "avatar-face-wink":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <line x1="14" y1="12" x2="18" y2="12" stroke="#111" strokeWidth="1.5" />
          <circle cx="24" cy="12" r="1.2" fill="#111" />
          <path d="M16 17 Q20 19 24 17" stroke="#ff7a5c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "avatar-face-blush":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <circle cx="16" cy="12" r="1.2" fill="#111" />
          <circle cx="24" cy="12" r="1.2" fill="#111" />
          <ellipse cx="13" cy="15" rx="2" ry="1.5" fill="#ff8fa6" opacity="0.7" />
          <ellipse cx="27" cy="15" rx="2" ry="1.5" fill="#ff8fa6" opacity="0.7" />
          <line x1="17" y1="17" x2="23" y2="17" stroke="#ff7a5c" strokeWidth="1.5" />
        </svg>
      );
    case "avatar-face-cool":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <rect x="12" y="11" width="16" height="4" fill="#111" />
          <rect x="19" y="12" width="2" height="2" fill="#111" />
          <line x1="17" y1="18" x2="23" y2="18" stroke="#2a2a2a" strokeWidth="1.5" />
        </svg>
      );
    case "avatar-face-determined":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <line x1="14" y1="10" x2="18" y2="11" stroke="#111" strokeWidth="1.4" />
          <line x1="22" y1="11" x2="26" y2="10" stroke="#111" strokeWidth="1.4" />
          <circle cx="16" cy="13" r="1.2" fill="#111" />
          <circle cx="24" cy="13" r="1.2" fill="#111" />
          <line x1="17" y1="18" x2="23" y2="18" stroke="#2a2a2a" strokeWidth="1.5" />
        </svg>
      );
    case "avatar-face-glasses":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <circle cx="16" cy="13" r="3.2" fill="none" stroke="#111" strokeWidth="1.4" />
          <circle cx="24" cy="13" r="3.2" fill="none" stroke="#111" strokeWidth="1.4" />
          <line x1="19" y1="13" x2="21" y2="13" stroke="#111" strokeWidth="1.4" />
          <line x1="16" y1="17" x2="23" y2="17" stroke="#ff7a5c" strokeWidth="1.4" />
        </svg>
      );

    case "avatar-outfit-tshirt":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <path d="M12 8 L16 5 L24 5 L28 8 L26 11 L25 11 L25 23 L15 23 L15 11 L14 11 Z" fill="#6da3d6" />
        </svg>
      );
    case "avatar-outfit-cozy":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <path d="M12 7 L16 5 L24 5 L28 7 L26 11 L25 11 L25 23 L15 23 L15 11 L14 11 Z" fill="#e8e1ce" />
          <rect x="16" y="13" width="8" height="0.5" fill="#b07a3e" />
        </svg>
      );
    case "avatar-outfit-hoodie":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <path d="M12 8 L15 5 L20 4 L25 5 L28 8 L26 11 L25 11 L25 23 L15 23 L15 11 L14 11 Z" fill="#4a9b66" />
          <ellipse cx="20" cy="6" rx="5" ry="3" fill="#4a9b66" />
          <line x1="20" y1="12" x2="20" y2="22" stroke="#2a2a2a" strokeWidth="0.5" />
        </svg>
      );
    case "avatar-outfit-dress":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <path d="M12 8 L16 5 L24 5 L28 8 L26 11 L25 11 L29 23 L11 23 L15 11 L14 11 Z" fill="#ff7a5c" />
        </svg>
      );
    case "avatar-outfit-sport":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <path d="M12 8 L16 5 L24 5 L28 8 L26 11 L25 11 L25 23 L15 23 L15 11 L14 11 Z" fill="#6da3d6" />
          <line x1="17" y1="13" x2="17" y2="22" stroke="#ffd84d" strokeWidth="1.2" />
          <line x1="23" y1="13" x2="23" y2="22" stroke="#ffd84d" strokeWidth="1.2" />
        </svg>
      );
    case "avatar-outfit-suit":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <path d="M12 8 L16 5 L24 5 L28 8 L26 11 L25 11 L25 23 L15 23 L15 11 L14 11 Z" fill="#2a2a2a" />
          <path d="M18 5 L20 12 L22 5" fill="#fff" />
          <rect x="19" y="6" width="2" height="2" fill="#c94335" />
        </svg>
      );

    case "avatar-acc-book":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="14" y="8" width="12" height="14" fill="#c94335" />
          <line x1="20" y1="8" x2="20" y2="22" stroke="#fff" strokeWidth="1" />
        </svg>
      );
    case "avatar-acc-backpack":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="13" y="6" width="14" height="18" rx="2" fill="#ff7a5c" />
          <rect x="15" y="10" width="4" height="4" fill="#e8e1ce" />
          <rect x="21" y="10" width="4" height="4" fill="#e8e1ce" />
          <rect x="17" y="16" width="6" height="4" fill="#e8e1ce" />
        </svg>
      );
    case "avatar-acc-headphones":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <path d="M10 14 Q10 6 20 6 Q30 6 30 14" stroke="#2a2a2a" strokeWidth="2" fill="none" />
          <rect x="8" y="13" width="5" height="6" rx="1" fill="#2a2a2a" />
          <rect x="27" y="13" width="5" height="6" rx="1" fill="#2a2a2a" />
        </svg>
      );
    case "avatar-acc-cape":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <path d="M12 6 L28 6 L30 23 L10 23 Z" fill="#c94335" />
          <rect x="12" y="6" width="16" height="2" fill="#ffd84d" />
        </svg>
      );
    case "avatar-acc-pet":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="20" rx="8" ry="4" fill="#fff" stroke="#2a2a2a" strokeWidth="0.5" />
          <circle cx="20" cy="13" r="5" fill="#fff" stroke="#2a2a2a" strokeWidth="0.5" />
          <path d="M16 8 L17 11 L18 9 Z" fill="#fff" />
          <path d="M22 9 L23 11 L24 8 Z" fill="#fff" />
          <circle cx="18" cy="13" r="0.7" fill="#2a2a2a" />
          <circle cx="22" cy="13" r="0.7" fill="#2a2a2a" />
        </svg>
      );

    // body
    case "avatar-body-boy":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="14" y="12" width="12" height="10" fill="#6da3d6" />
          <rect x="11" y="13" width="3" height="8" fill="#e8b89a" />
          <rect x="26" y="13" width="3" height="8" fill="#e8b89a" />
          <circle cx="20" cy="9" r="4" fill="#e8b89a" />
        </svg>
      );
    case "avatar-body-girl":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="15" y="12" width="10" height="6" fill="#ff7a5c" />
          <path d="M13 18 L27 18 L29 24 L11 24 Z" fill="#ff7a5c" />
          <rect x="12" y="13" width="3" height="6" fill="#e8b89a" />
          <rect x="25" y="13" width="3" height="6" fill="#e8b89a" />
          <circle cx="20" cy="9" r="4" fill="#e8b89a" />
        </svg>
      );

    case "avatar-hat-cap":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="14" rx="9" ry="7" fill="#e8b89a" />
          <path d="M11 11 Q11 5 20 5 Q29 5 29 11 L29 12 L11 12 Z" fill="#c94335" />
          <rect x="8" y="11" width="14" height="2" fill="#c94335" />
        </svg>
      );
    case "avatar-hat-beanie":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="15" rx="9" ry="6" fill="#e8b89a" />
          <path d="M10 13 Q10 4 20 4 Q30 4 30 13 Z" fill="#2a2a2a" />
          <rect x="10" y="11" width="20" height="2" fill="#c94335" />
          <circle cx="20" cy="3" r="2" fill="#c94335" />
        </svg>
      );
    case "avatar-hat-wizard":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="15" rx="9" ry="6" fill="#e8b89a" />
          <path d="M9 12 L31 12 L25 11 L20 1 L15 11 Z" fill="#4a3b8b" />
          <circle cx="20" cy="2" r="1.2" fill="#ffd84d" />
        </svg>
      );
    case "avatar-hat-crown":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="15" rx="9" ry="6" fill="#e8b89a" />
          <rect x="11" y="9" width="18" height="3" fill="#ffd84d" />
          <polygon points="11,9 13,4 15,9" fill="#ffd84d" />
          <polygon points="17,9 20,3 23,9" fill="#ffd84d" />
          <polygon points="25,9 27,4 29,9" fill="#ffd84d" />
          <circle cx="20" cy="10" r="1" fill="#ff3050" />
        </svg>
      );
    case "avatar-hat-chef":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="16" rx="9" ry="6" fill="#e8b89a" />
          <rect x="11" y="10" width="18" height="3" fill="#fff" />
          <ellipse cx="20" cy="6" rx="10" ry="5" fill="#fff" />
        </svg>
      );
    case "avatar-hat-graduate":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="15" rx="9" ry="6" fill="#e8b89a" />
          <rect x="11" y="9" width="18" height="3" fill="#2a2a2a" />
          <polygon points="6,6 34,6 20,1" fill="#2a2a2a" />
          <line x1="32" y1="6" x2="34" y2="11" stroke="#ffd84d" strokeWidth="1.5" />
          <circle cx="34" cy="12" r="1.5" fill="#ffd84d" />
        </svg>
      );

    case "avatar-glasses-round":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <circle cx="16" cy="13" r="3.2" fill="none" stroke="#111" strokeWidth="1.4" />
          <circle cx="24" cy="13" r="3.2" fill="none" stroke="#111" strokeWidth="1.4" />
          <line x1="19" y1="13" x2="21" y2="13" stroke="#111" strokeWidth="1.4" />
        </svg>
      );
    case "avatar-glasses-shades":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <rect x="12" y="11" width="16" height="4" fill="#111" />
        </svg>
      );
    case "avatar-glasses-monocle":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <circle cx="24" cy="13" r="3.5" fill="none" stroke="#ffd84d" strokeWidth="1.4" />
          <line x1="24" y1="17" x2="24" y2="22" stroke="#ffd84d" strokeWidth="1" />
        </svg>
      );
    case "avatar-glasses-ski":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <rect x="11" y="11" width="18" height="6" rx="2" fill="#111" />
          <rect x="12" y="12" width="16" height="4" rx="1" fill="#55ddff" opacity="0.6" />
        </svg>
      );
    case "avatar-glasses-3d":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <circle cx="20" cy="14" r="9" fill="#e8b89a" />
          <rect x="12" y="11" width="8" height="5" fill="#c94335" />
          <rect x="20" y="11" width="8" height="5" fill="#3060ff" />
        </svg>
      );

    case "avatar-back-backpack":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="13" y="6" width="14" height="18" rx="2" fill="#ff7a5c" />
          <rect x="15" y="10" width="4" height="4" fill="#e8e1ce" />
          <rect x="21" y="10" width="4" height="4" fill="#e8e1ce" />
          <rect x="17" y="16" width="6" height="4" fill="#e8e1ce" />
        </svg>
      );
    case "avatar-back-cape":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <path d="M12 6 L28 6 L30 23 L10 23 Z" fill="#c94335" />
          <rect x="12" y="6" width="16" height="2" fill="#ffd84d" />
        </svg>
      );
    case "avatar-back-wings":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <path d="M4 18 L16 8 L16 24 Z" fill="#fff" stroke="#ccc" strokeWidth="0.5" />
          <path d="M36 18 L24 8 L24 24 Z" fill="#fff" stroke="#ccc" strokeWidth="0.5" />
          <rect x="16" y="6" width="8" height="18" fill="#e8b89a" />
        </svg>
      );
    case "avatar-back-quiver":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="17" y="6" width="6" height="20" rx="1" fill="#6b4422" />
          <rect x="18" y="2" width="1" height="4" fill="#ff7a5c" />
          <rect x="20" y="2" width="1" height="4" fill="#ffd84d" />
          <rect x="22" y="2" width="1" height="4" fill="#0a8754" />
        </svg>
      );
    case "avatar-back-jetpack":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="14" y="7" width="12" height="14" rx="1" fill="#8a8f95" />
          <rect x="15" y="21" width="3" height="3" fill="#2a2a2a" />
          <rect x="22" y="21" width="3" height="3" fill="#2a2a2a" />
          <path d="M15 24 L16.5 27 L18 24 Z" fill="#ff7700" />
          <path d="M22 24 L23.5 27 L25 24 Z" fill="#ff7700" />
        </svg>
      );

    case "avatar-hand-book":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="14" y="8" width="12" height="14" fill="#c94335" />
          <line x1="20" y1="8" x2="20" y2="22" stroke="#fff" strokeWidth="1" />
        </svg>
      );
    case "avatar-hand-sword":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="19" y="3" width="2" height="16" fill="#8a8f95" />
          <rect x="16" y="19" width="8" height="2" fill="#ffd84d" />
          <rect x="18" y="21" width="4" height="4" fill="#6b4422" />
        </svg>
      );
    case "avatar-hand-pet":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="20" rx="8" ry="4" fill="#fff" stroke="#2a2a2a" strokeWidth="0.5" />
          <circle cx="20" cy="13" r="5" fill="#fff" stroke="#2a2a2a" strokeWidth="0.5" />
          <path d="M16 8 L17 11 L18 9 Z" fill="#fff" />
          <path d="M22 9 L23 11 L24 8 Z" fill="#fff" />
          <circle cx="18" cy="13" r="0.7" fill="#2a2a2a" />
          <circle cx="22" cy="13" r="0.7" fill="#2a2a2a" />
        </svg>
      );
    case "avatar-hand-flower":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="19" y="10" width="1" height="14" fill="#2d6b22" />
          <circle cx="20" cy="8" r="4" fill="#ff8fa6" />
          <circle cx="20" cy="8" r="1.5" fill="#ffd84d" />
        </svg>
      );
    case "avatar-hand-balloon":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <line x1="20" y1="24" x2="20" y2="14" stroke="#2a2a2a" strokeWidth="0.5" />
          <ellipse cx="20" cy="10" rx="6" ry="7" fill="#ff3060" />
        </svg>
      );
    case "avatar-hand-controller":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="8" y="12" width="24" height="8" rx="3" fill="#2a2a2a" />
          <circle cx="13" cy="16" r="1.2" fill="#ff7a5c" />
          <circle cx="17" cy="16" r="1.2" fill="#ffd84d" />
          <circle cx="23" cy="16" r="1.2" fill="#6bc44d" />
          <circle cx="27" cy="16" r="1.2" fill="#6da3d6" />
        </svg>
      );

    default:
      return null;
  }
}
