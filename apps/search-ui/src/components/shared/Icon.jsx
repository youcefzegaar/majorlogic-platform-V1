import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  Bell, Bookmark, Brain, Check, CheckCheck, CheckCircle,
  Edit, ExternalLink, History, Info, Menu, Moon,
  PieChart, Plus, PlusCircle, RotateCcw, RotateCw,
  Save, Settings, ShoppingCart, Sliders, Store,
  Sun, Target, Wallet, Wand2, X,
} from 'lucide-react';

const MAP = {
  'alert-triangle':       AlertTriangle,
  'arrow-down':           ArrowDown,
  'arrow-left':           ArrowLeft,
  'arrow-right':          ArrowRight,
  'arrow-up':             ArrowUp,
  'bars':                 Menu,
  'bell':                 Bell,
  'bookmark':             Bookmark,
  'brain':                Brain,
  'bullseye':             Target,
  'chart-pie':            PieChart,
  'check':                Check,
  'check-circle':         CheckCircle,
  'check-double':         CheckCheck,
  'cog':                  Settings,
  'edit':                 Edit,
  'exclamation-triangle': AlertTriangle,
  'external-link-alt':    ExternalLink,
  'history':              History,
  'info-circle':          Info,
  'magic':                Wand2,
  'moon':                 Moon,
  'plus':                 Plus,
  'plus-circle':          PlusCircle,
  'save':                 Save,
  'shopping-cart':        ShoppingCart,
  'sliders-h':            Sliders,
  'store':                Store,
  'sun':                  Sun,
  'sync-alt':             RotateCw,
  'times':                X,
  'undo':                 RotateCcw,
  'wallet':               Wallet,
};

export default function Icon({ name, size = 16, className, style }) {
  const Component = MAP[name];
  if (!Component) return null;
  return <Component size={size} className={className} style={style} />;
}
