import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  colors: {
    // Primary - Terracotta Brown (from "Rythme" in logo)
    brand: {
      50: '#fdf6f3',
      100: '#f9e8e0',
      200: '#f2d1c1',
      300: '#e5b39b',
      400: '#d39577',
      500: '#B97A5B', // Main terracotta
      600: '#a06346',
      700: '#7d4d38',
      800: '#5e3a2b',
      900: '#3f271d',
    },
    // Secondary - Teal Blue (from "Ethic" in logo)
    teal: {
      50: '#e8f9fc',
      100: '#c7eef5',
      200: '#a3e3ee',
      300: '#7dd7e7',
      400: '#5dccdf',
      500: '#44B6CB', // Main teal
      600: '#3495a7',
      700: '#287582',
      800: '#1d565e',
      900: '#12373a',
    },
    // Neutral colors from logo
    sand: {
      50: '#faf8f6',
      100: '#f0ece7',
      200: '#e6dfd7',
      300: '#dcd2c7',
      400: '#D7C8BA', // Main sand beige
      500: '#c4b0a0',
      600: '#a08977',
      700: '#7a6657',
      800: '#564a3f',
      900: '#322e28',
    },
    graphite: {
      50: '#f3f2f1',
      100: '#e0ddd9',
      200: '#bfb7b0',
      300: '#9d9187',
      400: '#7c6c5f',
      500: '#5A4C44', // Main graphite brown
      600: '#4a3e37',
      700: '#3a302b',
      800: '#2a221f',
      900: '#1a1413',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'white',
        color: 'graphite.500',
      },
      'h1, h2, h3, h4, h5, h6': {
        color: 'graphite.500',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.500',
          _hover: {
            bg: 'brand.50',
          },
        },
      },
    },
    Link: {
      baseStyle: {
        color: 'teal.500',
        _hover: {
          color: 'teal.600',
          textDecoration: 'underline',
        },
      },
    },
    Heading: {
      baseStyle: {
        color: 'graphite.500',
      },
    },
  },
});
