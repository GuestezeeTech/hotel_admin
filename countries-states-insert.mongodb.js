// Inserts the 8 countries with their states into the countries collection.
// Run in mongosh after: use <your database name>
// Stops without inserting if the collection already has countries.
if (db.countries.countDocuments({}) > 0) {
  print("countries already has " + db.countries.countDocuments({}) + " documents - nothing inserted.");
} else {
  const now = new Date();
  const countries = [
    {
      "id": 1,
      "country": "Austria",
      "code": "+43",
      "sort_order": 1,
      "states": [
        {
          "name": "Burgenland",
          "sort_order": 1,
          "is_active": true
        },
        {
          "name": "Carinthia",
          "sort_order": 2,
          "is_active": true
        },
        {
          "name": "Lower Austria",
          "sort_order": 3,
          "is_active": true
        },
        {
          "name": "Upper Austria",
          "sort_order": 4,
          "is_active": true
        },
        {
          "name": "Salzburg",
          "sort_order": 5,
          "is_active": true
        },
        {
          "name": "Styria",
          "sort_order": 6,
          "is_active": true
        },
        {
          "name": "Tyrol",
          "sort_order": 7,
          "is_active": true
        },
        {
          "name": "Vorarlberg",
          "sort_order": 8,
          "is_active": true
        },
        {
          "name": "Vienna",
          "sort_order": 9,
          "is_active": true
        }
      ],
      "organization_id": 30,
      "store_id": 1,
      "domain_name": "https://www.guestezee.com",
      "is_active": true,
      "is_deleted": false
    },
    {
      "id": 2,
      "country": "Germany",
      "code": "+49",
      "sort_order": 2,
      "states": [
        {
          "name": "Baden-Württemberg",
          "sort_order": 1,
          "is_active": true
        },
        {
          "name": "Bavaria",
          "sort_order": 2,
          "is_active": true
        },
        {
          "name": "Berlin",
          "sort_order": 3,
          "is_active": true
        },
        {
          "name": "Brandenburg",
          "sort_order": 4,
          "is_active": true
        },
        {
          "name": "Bremen",
          "sort_order": 5,
          "is_active": true
        },
        {
          "name": "Hamburg",
          "sort_order": 6,
          "is_active": true
        },
        {
          "name": "Hesse",
          "sort_order": 7,
          "is_active": true
        },
        {
          "name": "Lower Saxony",
          "sort_order": 8,
          "is_active": true
        },
        {
          "name": "Mecklenburg-Vorpommern",
          "sort_order": 9,
          "is_active": true
        },
        {
          "name": "North Rhine-Westphalia",
          "sort_order": 10,
          "is_active": true
        },
        {
          "name": "Rhineland-Palatinate",
          "sort_order": 11,
          "is_active": true
        },
        {
          "name": "Saarland",
          "sort_order": 12,
          "is_active": true
        },
        {
          "name": "Saxony",
          "sort_order": 13,
          "is_active": true
        },
        {
          "name": "Saxony-Anhalt",
          "sort_order": 14,
          "is_active": true
        },
        {
          "name": "Schleswig-Holstein",
          "sort_order": 15,
          "is_active": true
        },
        {
          "name": "Thuringia",
          "sort_order": 16,
          "is_active": true
        }
      ],
      "organization_id": 30,
      "store_id": 1,
      "domain_name": "https://www.guestezee.com",
      "is_active": true,
      "is_deleted": false
    },
    {
      "id": 3,
      "country": "India",
      "code": "+91",
      "sort_order": 3,
      "states": [
        {
          "name": "Andhra Pradesh",
          "sort_order": 1,
          "is_active": true
        },
        {
          "name": "Arunachal Pradesh",
          "sort_order": 2,
          "is_active": true
        },
        {
          "name": "Assam",
          "sort_order": 3,
          "is_active": true
        },
        {
          "name": "Bihar",
          "sort_order": 4,
          "is_active": true
        },
        {
          "name": "Chhattisgarh",
          "sort_order": 5,
          "is_active": true
        },
        {
          "name": "Goa",
          "sort_order": 6,
          "is_active": true
        },
        {
          "name": "Gujarat",
          "sort_order": 7,
          "is_active": true
        },
        {
          "name": "Haryana",
          "sort_order": 8,
          "is_active": true
        },
        {
          "name": "Himachal Pradesh",
          "sort_order": 9,
          "is_active": true
        },
        {
          "name": "Jharkhand",
          "sort_order": 10,
          "is_active": true
        },
        {
          "name": "Karnataka",
          "sort_order": 11,
          "is_active": true
        },
        {
          "name": "Kerala",
          "sort_order": 12,
          "is_active": true
        },
        {
          "name": "Madhya Pradesh",
          "sort_order": 13,
          "is_active": true
        },
        {
          "name": "Maharashtra",
          "sort_order": 14,
          "is_active": true
        },
        {
          "name": "Manipur",
          "sort_order": 15,
          "is_active": true
        },
        {
          "name": "Meghalaya",
          "sort_order": 16,
          "is_active": true
        },
        {
          "name": "Mizoram",
          "sort_order": 17,
          "is_active": true
        },
        {
          "name": "Nagaland",
          "sort_order": 18,
          "is_active": true
        },
        {
          "name": "Odisha",
          "sort_order": 19,
          "is_active": true
        },
        {
          "name": "Punjab",
          "sort_order": 20,
          "is_active": true
        },
        {
          "name": "Rajasthan",
          "sort_order": 21,
          "is_active": true
        },
        {
          "name": "Sikkim",
          "sort_order": 22,
          "is_active": true
        },
        {
          "name": "Tamil Nadu",
          "sort_order": 23,
          "is_active": true
        },
        {
          "name": "Telangana",
          "sort_order": 24,
          "is_active": true
        },
        {
          "name": "Tripura",
          "sort_order": 25,
          "is_active": true
        },
        {
          "name": "Uttar Pradesh",
          "sort_order": 26,
          "is_active": true
        },
        {
          "name": "Uttarakhand",
          "sort_order": 27,
          "is_active": true
        },
        {
          "name": "West Bengal",
          "sort_order": 28,
          "is_active": true
        }
      ],
      "organization_id": 30,
      "store_id": 1,
      "domain_name": "https://www.guestezee.com",
      "is_active": true,
      "is_deleted": false
    },
    {
      "id": 4,
      "country": "Poland",
      "code": "+48",
      "sort_order": 4,
      "states": [
        {
          "name": "Greater Poland",
          "sort_order": 1,
          "is_active": true
        },
        {
          "name": "Kuyavian-Pomeranian",
          "sort_order": 2,
          "is_active": true
        },
        {
          "name": "Lesser Poland",
          "sort_order": 3,
          "is_active": true
        },
        {
          "name": "Lower Silesian",
          "sort_order": 4,
          "is_active": true
        },
        {
          "name": "Lublin",
          "sort_order": 5,
          "is_active": true
        },
        {
          "name": "Lubusz",
          "sort_order": 6,
          "is_active": true
        },
        {
          "name": "Łódź",
          "sort_order": 7,
          "is_active": true
        },
        {
          "name": "Masovian",
          "sort_order": 8,
          "is_active": true
        },
        {
          "name": "Opole",
          "sort_order": 9,
          "is_active": true
        },
        {
          "name": "Podlaskie",
          "sort_order": 10,
          "is_active": true
        },
        {
          "name": "Pomeranian",
          "sort_order": 11,
          "is_active": true
        },
        {
          "name": "Silesian",
          "sort_order": 12,
          "is_active": true
        },
        {
          "name": "Subcarpathian",
          "sort_order": 13,
          "is_active": true
        },
        {
          "name": "Świętokrzyskie",
          "sort_order": 14,
          "is_active": true
        },
        {
          "name": "Warmian-Masurian",
          "sort_order": 15,
          "is_active": true
        },
        {
          "name": "West Pomeranian",
          "sort_order": 16,
          "is_active": true
        }
      ],
      "organization_id": 30,
      "store_id": 1,
      "domain_name": "https://www.guestezee.com",
      "is_active": true,
      "is_deleted": false
    },
    {
      "id": 5,
      "country": "Romania",
      "code": "+40",
      "sort_order": 5,
      "states": [
        {
          "name": "Alba",
          "sort_order": 1,
          "is_active": true
        },
        {
          "name": "Arad",
          "sort_order": 2,
          "is_active": true
        },
        {
          "name": "Argeș",
          "sort_order": 3,
          "is_active": true
        },
        {
          "name": "Bacău",
          "sort_order": 4,
          "is_active": true
        },
        {
          "name": "Bihor",
          "sort_order": 5,
          "is_active": true
        },
        {
          "name": "Bistrița-Năsăud",
          "sort_order": 6,
          "is_active": true
        },
        {
          "name": "Botoșani",
          "sort_order": 7,
          "is_active": true
        },
        {
          "name": "Brașov",
          "sort_order": 8,
          "is_active": true
        },
        {
          "name": "Brăila",
          "sort_order": 9,
          "is_active": true
        },
        {
          "name": "Bucharest",
          "sort_order": 10,
          "is_active": true
        },
        {
          "name": "Buzău",
          "sort_order": 11,
          "is_active": true
        },
        {
          "name": "Caraș-Severin",
          "sort_order": 12,
          "is_active": true
        },
        {
          "name": "Călărași",
          "sort_order": 13,
          "is_active": true
        },
        {
          "name": "Cluj",
          "sort_order": 14,
          "is_active": true
        },
        {
          "name": "Constanța",
          "sort_order": 15,
          "is_active": true
        },
        {
          "name": "Covasna",
          "sort_order": 16,
          "is_active": true
        },
        {
          "name": "Dâmbovița",
          "sort_order": 17,
          "is_active": true
        },
        {
          "name": "Dolj",
          "sort_order": 18,
          "is_active": true
        },
        {
          "name": "Galați",
          "sort_order": 19,
          "is_active": true
        },
        {
          "name": "Giurgiu",
          "sort_order": 20,
          "is_active": true
        },
        {
          "name": "Gorj",
          "sort_order": 21,
          "is_active": true
        },
        {
          "name": "Harghita",
          "sort_order": 22,
          "is_active": true
        },
        {
          "name": "Hunedoara",
          "sort_order": 23,
          "is_active": true
        },
        {
          "name": "Ialomița",
          "sort_order": 24,
          "is_active": true
        },
        {
          "name": "Iași",
          "sort_order": 25,
          "is_active": true
        },
        {
          "name": "Ilfov",
          "sort_order": 26,
          "is_active": true
        },
        {
          "name": "Maramureș",
          "sort_order": 27,
          "is_active": true
        },
        {
          "name": "Mehedinți",
          "sort_order": 28,
          "is_active": true
        },
        {
          "name": "Mureș",
          "sort_order": 29,
          "is_active": true
        },
        {
          "name": "Neamț",
          "sort_order": 30,
          "is_active": true
        },
        {
          "name": "Olt",
          "sort_order": 31,
          "is_active": true
        },
        {
          "name": "Prahova",
          "sort_order": 32,
          "is_active": true
        },
        {
          "name": "Sălaj",
          "sort_order": 33,
          "is_active": true
        },
        {
          "name": "Satu Mare",
          "sort_order": 34,
          "is_active": true
        },
        {
          "name": "Sibiu",
          "sort_order": 35,
          "is_active": true
        },
        {
          "name": "Suceava",
          "sort_order": 36,
          "is_active": true
        },
        {
          "name": "Teleorman",
          "sort_order": 37,
          "is_active": true
        },
        {
          "name": "Timiș",
          "sort_order": 38,
          "is_active": true
        },
        {
          "name": "Tulcea",
          "sort_order": 39,
          "is_active": true
        },
        {
          "name": "Vâlcea",
          "sort_order": 40,
          "is_active": true
        },
        {
          "name": "Vaslui",
          "sort_order": 41,
          "is_active": true
        },
        {
          "name": "Vrancea",
          "sort_order": 42,
          "is_active": true
        }
      ],
      "organization_id": 30,
      "store_id": 1,
      "domain_name": "https://www.guestezee.com",
      "is_active": true,
      "is_deleted": false
    },
    {
      "id": 6,
      "country": "Spain",
      "code": "+34",
      "sort_order": 6,
      "states": [
        {
          "name": "Andalusia",
          "sort_order": 1,
          "is_active": true
        },
        {
          "name": "Aragon",
          "sort_order": 2,
          "is_active": true
        },
        {
          "name": "Asturias",
          "sort_order": 3,
          "is_active": true
        },
        {
          "name": "Balearic Islands",
          "sort_order": 4,
          "is_active": true
        },
        {
          "name": "Basque Country",
          "sort_order": 5,
          "is_active": true
        },
        {
          "name": "Canary Islands",
          "sort_order": 6,
          "is_active": true
        },
        {
          "name": "Cantabria",
          "sort_order": 7,
          "is_active": true
        },
        {
          "name": "Castile and León",
          "sort_order": 8,
          "is_active": true
        },
        {
          "name": "Castile-La Mancha",
          "sort_order": 9,
          "is_active": true
        },
        {
          "name": "Catalonia",
          "sort_order": 10,
          "is_active": true
        },
        {
          "name": "Extremadura",
          "sort_order": 11,
          "is_active": true
        },
        {
          "name": "Galicia",
          "sort_order": 12,
          "is_active": true
        },
        {
          "name": "La Rioja",
          "sort_order": 13,
          "is_active": true
        },
        {
          "name": "Madrid",
          "sort_order": 14,
          "is_active": true
        },
        {
          "name": "Murcia",
          "sort_order": 15,
          "is_active": true
        },
        {
          "name": "Navarre",
          "sort_order": 16,
          "is_active": true
        },
        {
          "name": "Valencian Community",
          "sort_order": 17,
          "is_active": true
        }
      ],
      "organization_id": 30,
      "store_id": 1,
      "domain_name": "https://www.guestezee.com",
      "is_active": true,
      "is_deleted": false
    },
    {
      "id": 7,
      "country": "Switzerland",
      "code": "+41",
      "sort_order": 7,
      "states": [
        {
          "name": "Aargau",
          "sort_order": 1,
          "is_active": true
        },
        {
          "name": "Appenzell Ausserrhoden",
          "sort_order": 2,
          "is_active": true
        },
        {
          "name": "Appenzell Innerrhoden",
          "sort_order": 3,
          "is_active": true
        },
        {
          "name": "Basel-Landschaft",
          "sort_order": 4,
          "is_active": true
        },
        {
          "name": "Basel-Stadt",
          "sort_order": 5,
          "is_active": true
        },
        {
          "name": "Bern",
          "sort_order": 6,
          "is_active": true
        },
        {
          "name": "Fribourg",
          "sort_order": 7,
          "is_active": true
        },
        {
          "name": "Geneva",
          "sort_order": 8,
          "is_active": true
        },
        {
          "name": "Glarus",
          "sort_order": 9,
          "is_active": true
        },
        {
          "name": "Graubünden",
          "sort_order": 10,
          "is_active": true
        },
        {
          "name": "Jura",
          "sort_order": 11,
          "is_active": true
        },
        {
          "name": "Lucerne",
          "sort_order": 12,
          "is_active": true
        },
        {
          "name": "Neuchâtel",
          "sort_order": 13,
          "is_active": true
        },
        {
          "name": "Nidwalden",
          "sort_order": 14,
          "is_active": true
        },
        {
          "name": "Obwalden",
          "sort_order": 15,
          "is_active": true
        },
        {
          "name": "Schaffhausen",
          "sort_order": 16,
          "is_active": true
        },
        {
          "name": "Schwyz",
          "sort_order": 17,
          "is_active": true
        },
        {
          "name": "Solothurn",
          "sort_order": 18,
          "is_active": true
        },
        {
          "name": "St. Gallen",
          "sort_order": 19,
          "is_active": true
        },
        {
          "name": "Thurgau",
          "sort_order": 20,
          "is_active": true
        },
        {
          "name": "Ticino",
          "sort_order": 21,
          "is_active": true
        },
        {
          "name": "Uri",
          "sort_order": 22,
          "is_active": true
        },
        {
          "name": "Valais",
          "sort_order": 23,
          "is_active": true
        },
        {
          "name": "Vaud",
          "sort_order": 24,
          "is_active": true
        },
        {
          "name": "Zug",
          "sort_order": 25,
          "is_active": true
        },
        {
          "name": "Zurich",
          "sort_order": 26,
          "is_active": true
        }
      ],
      "organization_id": 30,
      "store_id": 1,
      "domain_name": "https://www.guestezee.com",
      "is_active": true,
      "is_deleted": false
    },
    {
      "id": 8,
      "country": "United Kingdom",
      "code": "+44",
      "sort_order": 8,
      "states": [
        {
          "name": "England",
          "sort_order": 1,
          "is_active": true
        },
        {
          "name": "Northern Ireland",
          "sort_order": 2,
          "is_active": true
        },
        {
          "name": "Scotland",
          "sort_order": 3,
          "is_active": true
        },
        {
          "name": "Wales",
          "sort_order": 4,
          "is_active": true
        }
      ],
      "organization_id": 30,
      "store_id": 1,
      "domain_name": "https://www.guestezee.com",
      "is_active": true,
      "is_deleted": false
    }
  ];
  const result = db.countries.insertMany(countries.map(c => ({ ...c, created_on: now, modified_on: now })));
  print("Inserted " + Object.keys(result.insertedIds).length + " countries.");
}
