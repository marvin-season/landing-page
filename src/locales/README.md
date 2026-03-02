# internationalization

## i18n support

i18n code example:

```tsx
import { Trans } from "@lingui/react/macro";

<Trans>Hello, world!</Trans>
```
extract i18n messages:

```bash
nr lingui:extract
```
manage i18n messages:
```js
// @src/locales/xx.po
msgid "Hello, world!"
msgstr "你好，世界！"
```

for production, compile i18n messages:
```bash
nr lingui:compile
```