import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  Bell, BookOpen, Bookmark, Brain, Check, CheckCheck, CheckCircle,
  Edit, ExternalLink, History, Info, LogOut, Menu, Moon,
  PieChart, Plus, PlusCircle, RotateCcw, RotateCw,
  Save, Settings, ShieldCheck, ShoppingCart, Sliders, Store,
  Sun, Target, User, Wallet, Wand2, X,
} from 'lucide-react';

const MAP = {
  'alert-triangle':       AlertTriangle,
  'arrow-down':           ArrowDown,
  'arrow-left':           ArrowLeft,
  'arrow-right':          ArrowRight,
  'arrow-up':             ArrowUp,
  'bars':                 Menu,
  'bell':                 Bell,
  'book-open':            BookOpen,
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
  'shield-alt':           ShieldCheck,
  'shopping-cart':        ShoppingCart,
  'sign-out-alt':         LogOut,
  'sliders-h':            Sliders,
  'store':                Store,
  'sun':                  Sun,
  'user':                 User,
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
