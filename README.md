# phones — KukuLanka product-only website

A mobile-first static phone catalogue using HTML, CSS and vanilla JavaScript.

## Pages

- `index.html` — All devices home catalogue with live search
- `phones.html` — brand/series catalogue, price sorting, model selector and filters
- `product.html?id=PRODUCT_ID` — product detail with WhatsApp ordering

## Catalogue

The live catalogue is stored in:

```text
/js/phones.js
```

This rebuilt version is generated only from rows in the supplied pricing workbook that contain at least one USD landed-cost price. It contains:

- 153 sellable condition/storage listings
- 51 distinct phone models
- 100 priced model/storage rows
- Apple, Samsung and Xiaomi Redmi devices only where the spreadsheet supplied a USD cost

Products and storage variants that had no USD price in the workbook were not added to `phones.js`.

Each catalogue record has this shape:

```js
{
  id: "iphone-13-128gb-99-new",
  brand: "Apple",
  family: "iPhone",
  model: "iPhone 13",
  storage: "128GB",
  condition: "99% New",
  batteryHealth: 100,
  price: 330,
  oldPrice: null,
  status: "preorder",
  available: true,
  featured: false,
  image: "assets/images/phones/iphone-13.webp"
}
```

## Device condition

The customer-facing conditions are exactly:

```text
Boxed
99% New
95% New
```

Only condition/storage combinations with a supplied cost in the pricing workbook are present.

## Website prices

The public `price` values are selling prices, not supplier costs.

Supplier/landed costs and profit calculations are kept in the companion workbook:

```text
pricing/KukuLanka_Phone_Pricing_Updated.xlsx
```

Costs and profits are deliberately not stored in the public JavaScript catalogue.

## Availability

All spreadsheet-priced listings are currently configured as:

```js
status: "preorder"
available: true
```

`status: "preorder"` displays **Pre-Order**.

Change `available` to `false` to hide a listing.

## Battery health

The site retains the existing catalogue default:

```js
batteryHealth: 100
```

Change it when you have a verified value for a specific listing.

## Images

Phone images belong in:

```text
/assets/images/phones/
```

The rebuilt catalogue reuses the existing WebP model images. Storage and condition variants share the same model image.

The exact filenames referenced by the rebuilt `phones.js` are listed in:

```text
/assets/images/phones/README.txt
```

## WhatsApp

Edit:

```text
/js/config.js
```

and set the real WhatsApp number.

## Search and filtering

Search is case-insensitive and searches brand, family, model, storage, condition and tags.

The catalogue retains:

- live search
- brand navigation
- series/family navigation
- model selector
- storage filter
- battery-health filter
- price sorting

## Local use

Run:

```bash
python -m http.server 8000
```

from this folder and open:

```text
http://localhost:8000/
```

## Project structure

```text
phones/
├── index.html
├── phones.html
├── product.html
├── README.md
├── pricing/
│   ├── KukuLanka_Phone_Pricing_Updated.xlsx
│   └── pricing-profit-report.txt
├── css/
│   └── main.css
├── js/
│   ├── config.js
│   ├── phones.js
│   └── main.js
└── assets/
    └── images/
        └── phones/
```
