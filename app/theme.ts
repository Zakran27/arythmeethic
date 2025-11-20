import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  colors: {
    // Primary - Dark Brown (primary text / strong accent)
    brand: {
      50: '#faf6f4',
      100: '#f0e6e0',
      200: '#e0cdc1',
      300: '#c8a895',
      400: '#a97761',
      500: '#6e3a25', // Main dark brown
      600: '#5f3220',
      700: '#4f291b',
      800: '#3f2116',
      900: '#2f1910',
    },
    // Secondary - Bright Cyan (highlight / links / CTA)
    accent: {
      50: '#e6f9fd',
      100: '#c2eef8',
      200: '#9be3f3',
      300: '#6fd8ee',
      400: '#4dcee9',
      500: '#25accc', // Main bright cyan
      600: '#1f92ad',
      700: '#19788e',
      800: '#135d6f',
      900: '#0d4350',
    },
    // Warm Terracotta (secondary / subtle accents)
    terracotta: {
      50: '#fbf3f0',
      100: '#f5e1d9',
      200: '#ecc8ba',
      300: '#e0a891',
      400: '#d19373',
      500: '#c3826e', // Main warm terracotta
      600: '#a66d5c',
      700: '#89574a',
      800: '#6c4238',
      900: '#4f2e27',
    },
    // Warm Beige (background sections / cards)
    sand: {
      50: '#faf8f6',
      100: '#f3efec',
      200: '#e8e1db',
      300: '#d9cfc5',
      400: '#c9bdb0',
      500: '#c1afa1', // Main warm beige
      600: '#a39385',
      700: '#857769',
      800: '#675b4e',
      900: '#493f34',
    },
    // Light Grey (default background, borders)
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#dddddd', // Main light grey
      500: '#bdbdbd',
      600: '#9e9e9e',
      700: '#757575',
      800: '#616161',
      900: '#424242',
    },
  },
  fonts: {
    heading: `'Georgia', 'Times New Roman', serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif`,
  },
  styles: {
    global: {
      body: {
        bg: '#f8f8f8',
        color: 'brand.500',
        lineHeight: '1.6',
      },
      'h1, h2, h3, h4, h5, h6': {
        color: 'brand.500',
        fontWeight: '600',
      },
      a: {
        color: 'accent.500',
        _hover: {
          color: 'accent.600',
          textDecoration: 'underline',
        },
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'md',
      },
      variants: {
        solid: (props: any) => {
          if (props.colorScheme === 'accent') {
            return {
              bg: 'accent.500',
              color: 'white',
              _hover: {
                bg: 'accent.600',
                _disabled: {
                  bg: 'accent.500',
                },
              },
            };
          }
          return {
            bg: 'brand.500',
            color: 'white',
            _hover: {
              bg: 'brand.600',
              _disabled: {
                bg: 'brand.500',
              },
            },
          };
        },
        outline: (props: any) => {
          if (props.colorScheme === 'accent') {
            return {
              borderColor: 'accent.500',
              color: 'accent.500',
              _hover: {
                bg: 'accent.50',
              },
            };
          }
          return {
            borderColor: 'brand.500',
            color: 'brand.500',
            _hover: {
              bg: 'sand.50',
            },
          };
        },
        ghost: {
          color: 'brand.500',
          _hover: {
            bg: 'sand.100',
          },
        },
      },
      defaultProps: {
        colorScheme: 'accent',
      },
    },
    Link: {
      baseStyle: {
        color: 'accent.500',
        _hover: {
          color: 'accent.600',
          textDecoration: 'underline',
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'white',
          borderRadius: 'lg',
          boxShadow: 'sm',
        },
      },
      variants: {
        beige: {
          container: {
            bg: 'sand.500',
            color: 'brand.500',
          },
        },
      },
    },
    Heading: {
      baseStyle: {
        color: 'brand.500',
      },
    },
    Text: {
      baseStyle: {
        color: 'brand.500',
      },
    },
    Badge: {
      variants: {
        subtle: (props: any) => {
          if (props.colorScheme === 'accent') {
            return {
              bg: 'accent.50',
              color: 'accent.700',
            };
          }
          return {
            bg: 'sand.200',
            color: 'brand.600',
          };
        },
      },
    },
  },
});
