# Snapgrade product icons

Product icons are rendered only through `MorphIcon` from `morphicons/react`.
The paths in `snapgrade-icons.jsx` are small, original 24px stroke paths so
Snapgrade does not mix icon-library styles.

`components.json` retains shadcn's supported `lucide` configuration solely for
CLI compatibility. Generated component icon imports must be replaced with a
Snapgrade Morphicon before they are used in product UI.
