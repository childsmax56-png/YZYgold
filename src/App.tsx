import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { XCircle, ChevronUp, X } from 'lucide-react';
import axios from 'axios';