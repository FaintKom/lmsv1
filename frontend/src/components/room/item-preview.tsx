/**
 * 2D SVG preview shown in shop cards. Each case maps a backend room_items.id
 * to a tiny iconographic representation of the 3D item -- not pixel-perfect,
 * just enough to identify the piece at a glance. Walls and floors get their
 * own treatment (a swatch + pattern, handled by the shop card itself).
 */

interface ItemPreviewProps {
  id: string;
}

export function ItemPreview({ id }: ItemPreviewProps) {
  switch (id) {
    case "bed-basic":
    case "bed-kids":
    case "bed-double":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect
            x="4"
            y="14"
            width="32"
            height="10"
            rx="1"
            fill={id === "bed-kids" ? "#ff7a5c" : id === "bed-double" ? "#a48dc8" : "#b07a3e"}
          />
          <rect x="6" y="12" width="28" height="4" fill="#fafbf6" />
          <rect x="4" y="6" width="6" height="12" fill="#6b4422" />
          <rect x="12" y="10" width="8" height="2" fill="#fff" />
        </svg>
      );
    case "desk-wood":
    case "desk-white":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="4" y="12" width="32" height="3" fill={id === "desk-white" ? "#f2efe7" : "#d9a26a"} />
          <rect x="5" y="15" width="2" height="10" fill="#6b4422" />
          <rect x="33" y="15" width="2" height="10" fill="#6b4422" />
        </svg>
      );
    case "chair":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="13" y="6" width="14" height="3" fill="#6da3d6" />
          <rect x="13" y="9" width="14" height="8" fill="#6da3d6" />
          <rect x="13" y="17" width="3" height="6" fill="#6b4422" />
          <rect x="24" y="17" width="3" height="6" fill="#6b4422" />
        </svg>
      );
    case "vox-monitor":
    case "monitor":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="8" y="5" width="24" height="14" rx="1" fill="#2a2a2a" />
          <rect x="10" y="7" width="20" height="10" fill="#65c8b3" />
          <rect x="18" y="19" width="4" height="3" fill="#2a2a2a" />
        </svg>
      );
    case "vox-drawers":
    case "dresser-blue":
    case "dresser-cream":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="6" y="6" width="28" height="18" fill={id === "dresser-blue" ? "#65c8b3" : "#f2efe7"} />
          <line x1="6" y1="12" x2="34" y2="12" stroke="#2a2a2a" strokeWidth="0.5" opacity="0.5" />
          <line x1="6" y1="18" x2="34" y2="18" stroke="#2a2a2a" strokeWidth="0.5" opacity="0.5" />
          <circle cx="20" cy="9" r="1" fill="#6b4422" />
          <circle cx="20" cy="15" r="1" fill="#6b4422" />
          <circle cx="20" cy="21" r="1" fill="#6b4422" />
        </svg>
      );
    case "vox-bookshelf":
    case "shelf-tall":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="13" y="2" width="14" height="24" fill="none" stroke="#b07a3e" strokeWidth="2" />
          <line x1="13" y1="11" x2="27" y2="11" stroke="#b07a3e" strokeWidth="1.5" />
          <line x1="13" y1="19" x2="27" y2="19" stroke="#b07a3e" strokeWidth="1.5" />
          <rect x="15" y="13" width="2" height="5" fill="#c94335" />
          <rect x="18" y="13" width="2" height="5" fill="#0a8754" />
          <rect x="21" y="13" width="2" height="5" fill="#6da3d6" />
        </svg>
      );
    case "shelf-wall":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="5" y="14" width="30" height="2" fill="#b07a3e" />
          <rect x="8" y="6" width="3" height="8" fill="#c94335" />
          <rect x="12" y="6" width="3" height="8" fill="#6da3d6" />
          <rect x="16" y="6" width="3" height="8" fill="#ffd84d" />
          <rect x="20" y="6" width="3" height="8" fill="#0a8754" />
        </svg>
      );
    case "cabinet":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="9" y="6" width="22" height="16" fill="#ffd84d" />
          <rect x="11" y="8" width="8" height="12" fill="#fafbf6" />
          <rect x="21" y="8" width="8" height="12" fill="#fafbf6" />
        </svg>
      );
    case "sofa":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="4" y="14" width="32" height="8" fill="#e8e1ce" />
          <rect x="4" y="9" width="32" height="6" fill="#e8e1ce" />
          <rect x="6" y="13" width="8" height="3" fill="#fff" />
          <rect x="16" y="13" width="8" height="3" fill="#fff" />
          <rect x="26" y="13" width="8" height="3" fill="#fff" />
        </svg>
      );
    case "coffee-table":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="6" y="14" width="28" height="3" fill="#b07a3e" />
          <rect x="8" y="17" width="2" height="6" fill="#6b4422" />
          <rect x="30" y="17" width="2" height="6" fill="#6b4422" />
          <rect x="14" y="11" width="8" height="3" fill="#fff" />
        </svg>
      );
    case "arcade":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="14" y="3" width="12" height="22" fill="#c94335" />
          <rect x="15" y="5" width="10" height="2" fill="#ffd84d" />
          <rect x="15" y="8" width="10" height="6" fill="#111c2a" />
          <rect x="15" y="15" width="10" height="3" fill="#2a2a2a" />
          <circle cx="17" cy="19" r="1" fill="#ffd84d" />
          <circle cx="20" cy="19" r="1" fill="#6bc44d" />
          <circle cx="23" cy="19" r="1" fill="#6da3d6" />
        </svg>
      );
    case "lamp":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="13" y="4" width="14" height="6" fill="#ffd84d" />
          <rect x="19" y="10" width="2" height="14" fill="#8a8f95" />
          <rect x="15" y="24" width="10" height="2" fill="#2a2a2a" />
        </svg>
      );
    case "vox-plant":
    case "plant":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="14" y="17" width="12" height="8" fill="#c46b3c" />
          <path d="M20 17 L20 6 L24 4 L26 9 Z" fill="#4d9a3b" />
          <path d="M20 17 L20 8 L16 5 L14 10 Z" fill="#2d6b22" />
          <path d="M20 17 L20 4 L22 2 L21 6 Z" fill="#4d9a3b" />
        </svg>
      );
    case "rug-teal":
    case "rug-warm":
    case "rug-mint": {
      const main = id === "rug-teal" ? "#2a8a8a" : id === "rug-warm" ? "#c46b3c" : "#b0d9c2";
      const accent = id === "rug-teal" ? "#65c8b3" : id === "rug-warm" ? "#ffd84d" : "#0a8754";
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="4" y="8" width="32" height="14" rx="1" fill={main} />
          <rect x="4" y="8" width="32" height="2" fill={accent} />
          <rect x="4" y="20" width="32" height="2" fill={accent} />
        </svg>
      );
    }
    case "pictures":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="6" y="8" width="9" height="9" fill="#fff" stroke="#ff7a5c" strokeWidth="1.5" />
          <rect x="17" y="8" width="9" height="9" fill="#fff" stroke="#0a8754" strokeWidth="1.5" />
          <rect x="28" y="8" width="9" height="9" fill="#fff" stroke="#6da3d6" strokeWidth="1.5" />
        </svg>
      );
    case "window":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="8" y="5" width="24" height="18" fill="#fff9c2" stroke="#b07a3e" strokeWidth="2" />
          <line x1="20" y1="5" x2="20" y2="23" stroke="#b07a3e" strokeWidth="1.5" />
          <line x1="8" y1="14" x2="32" y2="14" stroke="#b07a3e" strokeWidth="1.5" />
        </svg>
      );
    case "plushie":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <ellipse cx="20" cy="20" rx="8" ry="5" fill="#fff" stroke="#2a2a2a" strokeWidth="0.5" />
          <circle cx="20" cy="12" r="6" fill="#fff" stroke="#2a2a2a" strokeWidth="0.5" />
          <rect x="14" y="3" width="3" height="6" fill="#fff" />
          <rect x="23" y="3" width="3" height="6" fill="#fff" />
          <circle cx="17" cy="11" r="1" fill="#2a2a2a" />
          <circle cx="23" cy="11" r="1" fill="#2a2a2a" />
          <ellipse cx="20" cy="14" rx="1" ry="0.6" fill="#ff7a5c" />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="15" y="20" width="10" height="4" fill="#6b4422" />
          <rect x="17" y="6" width="6" height="14" fill="#ffd84d" />
          <rect x="13" y="8" width="4" height="6" fill="#ffd84d" />
          <rect x="23" y="8" width="4" height="6" fill="#ffd84d" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="11" y="4" width="18" height="18" rx="1" fill="#6b4422" />
          <rect x="13" y="6" width="14" height="14" fill="#fff" />
          <line x1="20" y1="13" x2="20" y2="8" stroke="#2a2a2a" strokeWidth="1.4" />
          <line x1="20" y1="13" x2="24" y2="13" stroke="#2a2a2a" strokeWidth="1.4" />
        </svg>
      );
    case "vox-keyboard":
      return (
        <svg viewBox="0 0 40 28" width="100%" height="100%">
          <rect x="5" y="11" width="30" height="9" rx="1.5" fill="#2a2a2a" />
          <rect x="7" y="13" width="3" height="2" fill="#8a8f95" />
          <rect x="11" y="13" width="3" height="2" fill="#8a8f95" />
          <rect x="15" y="13" width="3" height="2" fill="#8a8f95" />
          <rect x="19" y="13" width="3" height="2" fill="#8a8f95" />
          <rect x="23" y="13" width="3" height="2" fill="#8a8f95" />
          <rect x="27" y="13" width="3" height="2" fill="#8a8f95" />
          <rect x="11" y="16" width="18" height="2" fill="#8a8f95" />
        </svg>
      );
    default:
      return null;
  }
}
