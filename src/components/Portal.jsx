// src/components/Portal.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const Portal = ({ children }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const modalRoot = document.getElementById('modal-root');

    if (!mounted || !modalRoot) {
        return null;
    }

    return createPortal(children, modalRoot);
};

export default Portal;