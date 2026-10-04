#!/usr/bin/env python3
# scripts/everyday_foods.py — 04 Oct 2026 v1
# Adds everyday, shop-bought and takeaway foods to data/food_reference.json,
# generic (no brands, no shops), so typed names like "pizza", "kebab",
# "crumpets", "crisps" or "a sandwich" resolve to real figures straight away.
#
# Figures come from CoFID 2019 (data/cofid.json, McCance and Widdowson, OGL
# v3.0) wherever it has the food, named by its exact CoFID name. A handful
# CoFID lacks (chicken nuggets, hash browns, garlic bread, protein bars,
# onion bhajis, pretzels, rice cakes, burger buns, wraps already exist) carry
# typical UK label averages, and say so in `basis`.
#
# grams_per_item is a typical single item ("a crumpet", "a bag of crisps");
# portion_g is a typical adult portion, used to sanity-check own recipes.
# Run: python3 scripts/everyday_foods.py   (idempotent: replaces its own slugs)

import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, 'data', 'food_reference.json')
COFID = os.path.join(ROOT, 'data', 'cofid.json')

# slug, name, category, aliases, cofid name or own figures, item_label, grams_per_item, portion_g
# own figures: (kcal, protein, fat, carbs, fibre)
F, A, FR = 'food_fresh', 'food_ambient', 'food_frozen'
ITEMS = [
    # Fish and chips night
    ('breaded-fish-baked', 'Breaded fish fillet, oven baked', FR, ['breaded fish', 'breaded cod', 'breaded haddock', 'fish in breadcrumbs', 'breaded fish fillet'], 'Cod, in breadcrumbs, baked', 'fillet', 125, 125),
    ('battered-fish-baked', 'Battered fish fillet, oven baked', FR, ['battered fish', 'battered cod', 'battered haddock', 'fish in batter', 'beer battered fish'], 'Cod, in batter, baked', 'fillet', 140, 140),
    ('battered-fish-chippy', 'Fish in batter, from the chip shop', F, ['chip shop fish', 'chippy fish', 'takeaway fish'], 'Cod, in batter, fried, takeaway', 'portion', 200, 200),
    ('oven-chips', 'Oven chips, baked', FR, ['oven chips', 'chips', 'frozen chips', 'french fries', 'fries', 'straight cut chips', 'crinkle cut chips'], 'Potato chips, oven ready, no batter, baked', None, None, 165),
    ('chippy-chips', 'Chips, from the chip shop', F, ['chip shop chips', 'chippy chips', 'takeaway chips'], 'Potato chips, fried in commercial oil, from takeaway fish and chip shops', 'portion', 250, 250),
    ('potato-wedges', 'Potato wedges, oven baked', FR, ['wedges', 'potato wedges'], 'Potato wedges, retail, cooked', None, None, 165),
    ('peas-frozen-cooked', 'Peas, frozen, cooked', FR, ['frozen peas cooked', 'garden peas', 'boiled peas'], 'Peas, frozen, boiled in unsalted water', None, None, 80),
    ('mushy-peas', 'Mushy peas', A, ['mushy peas', 'processed peas'], 'Peas, mushy, canned, re-heated', None, None, 80),
    ('fish-fingers', 'Fish fingers, oven baked', FR, ['fish fingers', 'fish finger'], 'Fish fingers, cod, grilled/baked', 'finger', 28, 112),
    ('fishcakes-breaded', 'Fishcakes, breaded, baked', FR, ['fishcakes', 'fish cakes', 'fishcake'], 'Fishcakes, white fish, coated in breadcrumbs, baked', 'fishcake', 85, 170),
    ('scampi', 'Scampi, breaded, baked', FR, ['scampi'], 'Scampi, coated in breadcrumbs, baked', None, None, 150),
    ('tartare-sauce', 'Tartare sauce', A, ['tartare sauce', 'tartar sauce'], (290, 1.0, 29.0, 6.0, 0.3), None, None, 15),
    # Takeaway and ready meals
    ('pizza-cheese-tomato', 'Pizza, cheese and tomato', FR, ['pizza', 'margherita pizza', 'frozen pizza', 'cheese and tomato pizza'], 'Pizza, cheese and tomato, retail', 'pizza', 330, 165),
    ('pizza-meat', 'Pizza, meat topped', FR, ['pepperoni pizza', 'meat feast pizza', 'meat pizza', 'takeaway pizza'], 'Pizza, meat topped, retail and takeaway', 'pizza', 400, 200),
    ('pizza-vegetarian', 'Pizza, vegetable topped', FR, ['vegetable pizza', 'veggie pizza', 'vegetarian pizza'], 'Pizza, vegetarian, retail and takeaway', 'pizza', 380, 190),
    ('pizza-ham-pineapple', 'Pizza, ham and pineapple', FR, ['ham and pineapple pizza', 'hawaiian pizza'], 'Pizza, ham and pineapple, retail', 'pizza', 380, 190),
    ('doner-kebab', 'Doner kebab in pitta with salad', F, ['kebab', 'doner kebab', 'doner', 'takeaway kebab'], 'Doner kebab in pitta bread with salad', 'kebab', 400, 400),
    ('shish-kebab', 'Shish kebab in pitta with salad', F, ['shish kebab', 'chicken shish'], 'Shish kebab in pitta bread with salad', 'kebab', 350, 350),
    ('beef-burger', 'Beef burger, grilled', FR, ['burger', 'beef burger', 'burgers', 'quarter pounder', 'hamburger patty'], 'Burger, beef, 62-85%, beef, grilled', 'burger', 85, 85),
    ('beef-burger-homemade', 'Beef burger, homemade, grilled', F, ['homemade burger', 'smash burger'], 'Burger, beef, grilled, homemade', 'burger', 110, 110),
    ('cheeseburger-takeaway', 'Cheeseburger, takeaway', F, ['cheeseburger', 'takeaway burger', 'fast food burger'], 'Burger, cheeseburger, takeaway', 'burger', 120, 120),
    ('chicken-burger-takeaway', 'Chicken burger, takeaway', F, ['chicken burger'], 'Burger, chicken, takeaway', 'burger', 180, 180),
    ('burger-bun', 'Burger bun', A, ['burger bun', 'burger buns', 'brioche bun', 'bap'], (270, 9.0, 4.5, 47.0, 2.5), 'bun', 60, 60),
    ('bread-roll-white', 'Bread roll, white', A, ['bread roll', 'white roll', 'roll', 'dinner roll', 'baguette'], 'Bread rolls, white, crusty', 'roll', 60, 60),
    ('bread-roll-brown', 'Bread roll, brown', A, ['brown roll', 'wholemeal roll'], 'Bread rolls, brown, crusty', 'roll', 60, 60),
    ('hot-dog-sausage', 'Hot dog sausage', F, ['hot dog', 'hot dogs', 'frankfurter', 'frankfurters'], 'Frankfurter', 'sausage', 45, 90),
    ('chicken-nuggets', 'Chicken nuggets, oven baked', FR, ['chicken nuggets', 'nuggets', 'chicken dippers'], (250, 15.0, 13.0, 18.0, 1.5), 'nugget', 18, 108),
    ('breaded-chicken', 'Breaded chicken pieces, baked', FR, ['breaded chicken', 'chicken goujons', 'goujons', 'chicken strips', 'popcorn chicken', 'chicken kiev'], 'Chicken/turkey pieces, coated, baked', None, None, 150),
    ('chicken-tikka-masala-ready', 'Chicken tikka masala, ready meal', F, ['chicken tikka masala', 'tikka masala', 'curry ready meal', 'chicken curry ready meal'], 'Curry, chicken tikka masala, retail, reheated', 'pack', 400, 350),
    ('chicken-korma', 'Chicken korma', F, ['chicken korma', 'korma'], 'Curry, chicken korma, homemade', None, None, 350),
    ('egg-fried-rice', 'Egg fried rice', F, ['egg fried rice', 'fried rice'], 'Rice, egg fried, takeaway', None, None, 250),
    ('chow-mein', 'Chicken chow mein, takeaway', F, ['chow mein', 'chicken chow mein'], 'Chow mein, chicken, takeaway', None, None, 350),
    ('sweet-sour-chicken', 'Sweet and sour chicken, takeaway', F, ['sweet and sour chicken', 'sweet and sour'], 'Sweet and sour chicken, takeaway', None, None, 300),
    ('spring-roll', 'Spring rolls', FR, ['spring rolls', 'spring roll'], 'Spring rolls, meat, takeaway', 'roll', 60, 120),
    ('prawn-crackers', 'Prawn crackers', A, ['prawn crackers'], 'Prawn crackers, takeaway', None, None, 25),
    ('samosa-vegetable', 'Vegetable samosa', F, ['samosa', 'samosas', 'vegetable samosa'], 'Samosas, vegetable, retail', 'samosa', 60, 120),
    ('onion-bhaji', 'Onion bhaji', F, ['onion bhaji', 'onion bhajis', 'bhaji'], (280, 6.0, 18.0, 24.0, 4.0), 'bhaji', 50, 100),
    ('lasagne-ready', 'Lasagne, ready meal', FR, ['lasagne', 'frozen lasagne', 'beef lasagne', 'ready meal lasagne'], 'Lasagne, retail, reheated', 'pack', 400, 400),
    ('lasagne-vegetable-ready', 'Vegetable lasagne, ready meal', FR, ['vegetable lasagne', 'veggie lasagne'], 'Lasagne, vegetable, retail', 'pack', 400, 400),
    ('cottage-pie-ready', 'Cottage or shepherd\'s pie, ready meal', FR, ['cottage pie ready meal', 'shepherds pie ready meal', 'frozen cottage pie'], 'Pie, Cottage/Shepherd\'s, reheated', 'pack', 400, 400),
    ('spag-bol-ready', 'Spaghetti bolognese, ready meal', FR, ['spaghetti bolognese ready meal', 'spag bol ready meal'], 'Spaghetti bolognese, retail, reheated, with spaghetti', 'pack', 400, 400),
    ('chilli-con-carne-ready', 'Chilli con carne with rice, ready meal', FR, ['chilli ready meal', 'chilli con carne ready meal'], 'Chilli con carne, retail, reheated, with rice', 'pack', 400, 400),
    ('macaroni-cheese', 'Macaroni cheese', F, ['macaroni cheese', 'mac and cheese', 'mac n cheese'], 'Macaroni cheese, homemade', None, None, 300),
    ('fish-pie-ready', 'Fish pie, ready meal', FR, ['fish pie ready meal'], 'Pie, fish, white fish, retail, baked', 'pack', 400, 400),
    ('vegetable-curry-ready', 'Vegetable curry, ready meal', F, ['vegetable curry', 'veg curry'], 'Curry, vegetable, ready meal, without rice, cooked', 'pack', 350, 350),
    # Bakery and breakfast
    ('crumpet-toasted', 'Crumpets', A, ['crumpets', 'toasted crumpet'], 'Crumpets, toasted', 'crumpet', 55, 110),
    ('english-muffin', 'English muffin', A, ['english muffin', 'english muffins'], 'Muffins, English style, white', 'muffin', 65, 65),
    ('croissant', 'Croissant', A, ['croissant', 'croissants', 'pain au chocolat'], 'Croissants', 'croissant', 60, 60),
    ('hot-cross-bun', 'Hot cross bun', A, ['hot cross bun', 'hot cross buns', 'teacake', 'teacakes'], 'Hot cross buns, homemade', 'bun', 70, 70),
    ('scone-fruit', 'Fruit scone', A, ['scone', 'scones', 'fruit scone'], 'Scones, fruit, retail', 'scone', 70, 70),
    ('doughnut-jam', 'Doughnut', A, ['doughnut', 'donut', 'jam doughnut', 'ring doughnut'], 'Doughnuts, with jam', 'doughnut', 75, 75),
    ('muffin-american', 'Muffin, American style', A, ['muffin', 'blueberry muffin', 'chocolate muffin', 'muffins'], 'Muffins, American, not chocolate, retail', 'muffin', 110, 110),
    ('pancakes-sweet', 'Pancakes', F, ['pancakes', 'pancake', 'crepes'], 'Pancakes, sweet, made with semi skimmed milk, homemade', 'pancake', 50, 100),
    ('waffles', 'Waffles', A, ['waffle', 'waffles'], 'Waffles, homemade', 'waffle', 35, 70),
    ('cornflakes', 'Cornflakes', A, ['cornflakes', 'corn flakes'], 'Breakfast cereal, cornflakes, fortified', None, None, 30),
    ('bran-flakes', 'Bran flakes', A, ['bran flakes'], 'Breakfast cereal, bran flakes, fortified', None, None, 30),
    ('wheat-biscuits', 'Wheat biscuit cereal', A, ['wheat biscuits', 'wheat biscuit cereal'], 'Breakfast cereal, wheat biscuits, Weetabix type, fortified', 'biscuit', 19, 38),
    ('muesli', 'Muesli', A, ['muesli'], 'Muesli, Swiss style, unfortified', None, None, 45),
    ('porridge-milk', 'Porridge made with semi-skimmed milk', F, ['porridge', 'porridge with milk'], 'Porridge oats, unfortified, cooked, made up with semi-skimmed milk', None, None, 250),
    ('hash-brown', 'Hash browns, oven baked', FR, ['hash brown', 'hash browns'], (200, 2.5, 10.0, 25.0, 2.5), 'hash brown', 45, 90),
    ('yorkshire-pudding', 'Yorkshire pudding', FR, ['yorkshire pudding', 'yorkshire puddings', 'yorkshires'], 'Yorkshire pudding, made with semi-skimmed milk, homemade', 'pudding', 20, 40),
    ('garlic-bread', 'Garlic bread', FR, ['garlic bread', 'garlic baguette'], (350, 8.0, 16.0, 43.0, 2.5), 'slice', 30, 60),
    ('chapati', 'Chapati', A, ['chapati', 'chapatis', 'roti'], 'Chapatis, made without fat', 'chapati', 45, 45),
    # Meat and deli
    ('bacon-back-grilled', 'Bacon, back rashers, grilled', F, ['bacon', 'back bacon', 'bacon rashers', 'grilled bacon'], 'Bacon rashers, back, grilled', 'rasher', 25, 50),
    ('bacon-streaky-grilled', 'Bacon, streaky, grilled', F, ['streaky bacon', 'smoked streaky bacon'], 'Bacon rashers, streaky, grilled', 'rasher', 15, 30),
    ('sausages-pork-grilled', 'Sausages, pork, grilled', F, ['sausages', 'pork sausages', 'bangers', 'grilled sausages'], 'Sausages, pork, chilled, grilled', 'sausage', 57, 114),
    ('sausages-reduced-fat', 'Sausages, reduced fat, grilled', F, ['reduced fat sausages', 'low fat sausages'], 'Sausages, pork, reduced fat, grilled', 'sausage', 57, 114),
    ('sausage-roll', 'Sausage roll', F, ['sausage roll', 'sausage rolls'], 'Sausage roll, flaky pastry, ready-to-eat, retail', 'roll', 130, 130),
    ('pork-pie', 'Pork pie', F, ['pork pie', 'pork pies', 'mini pork pie'], 'Pork pie, individual', 'pie', 140, 140),
    ('cornish-pasty', 'Cornish pasty', F, ['pasty', 'cornish pasty', 'steak bake'], 'Cornish pasty, retail', 'pasty', 230, 230),
    ('scotch-egg', 'Scotch egg', F, ['scotch egg', 'scotch eggs'], 'Scotch eggs, retail', 'egg', 113, 113),
    ('quiche-lorraine', 'Quiche Lorraine', F, ['quiche', 'quiche lorraine'], 'Quiche, Lorraine, shortcrust pastry, retail', None, None, 150),
    ('ham-sliced', 'Ham, sliced', F, ['sliced ham', 'cooked ham'], 'Ham', 'slice', 25, 50),
    ('salami', 'Salami', F, ['salami', 'pepperoni'], 'Salami', 'slice', 8, 30),
    ('chicken-breast-roast', 'Chicken breast, cooked', F, ['cooked chicken', 'roast chicken breast', 'chicken pieces cooked'], 'Chicken, breast, grilled without skin, meat only', None, None, 140),
    # Snacks and sweets
    ('crisps', 'Crisps', A, ['crisps', 'packet of crisps', 'bag of crisps', 'potato crisps'], 'Potato crisps, fried in sunflower oil', 'bag', 25, 25),
    ('crisps-lower-fat', 'Crisps, lower fat', A, ['lower fat crisps', 'baked crisps', 'low fat crisps'], 'Potato crisps, low fat', 'bag', 25, 25),
    ('tortilla-chips', 'Tortilla chips', A, ['tortilla chips', 'nachos'], 'Tortilla chips fried in sunflower oil', None, None, 30),
    ('popcorn-salted', 'Popcorn, salted', A, ['popcorn'], 'Popcorn, salted, retail', 'bag', 30, 30),
    ('pretzels', 'Pretzels', A, ['pretzels', 'pretzel'], (380, 10.0, 3.5, 77.0, 3.0), None, None, 30),
    ('rice-cakes', 'Rice cakes', A, ['rice cakes', 'rice cake'], (385, 8.0, 3.0, 80.0, 3.0), 'cake', 8, 16),
    ('milk-chocolate-bar', 'Milk chocolate bar', A, ['chocolate bar', 'milk chocolate', 'chocolate', 'bar of chocolate'], 'Chocolate, milk', 'bar', 45, 45),
    ('caramel-chocolate-bar', 'Chocolate bar with caramel', A, ['caramel bar', 'chocolate caramel bar', 'caramel chocolate'], 'Caramel bars and sweets, chocolate covered', 'bar', 50, 50),
    ('chocolate-wafer-bar', 'Chocolate covered wafer', A, ['wafer bar', 'chocolate wafer'], 'Chocolate covered wafer biscuit', 'bar', 42, 42),
    ('cereal-bar', 'Cereal bar', A, ['cereal bar', 'cereal bars', 'granola bar', 'oat bar'], 'Cereal bars, with fruit and/or nuts, no chocolate, unfortified', 'bar', 30, 30),
    ('cereal-bar-chocolate', 'Cereal bar with chocolate', A, ['chocolate cereal bar'], 'Cereal bars, with fruit and/or nuts, with chocolate, unfortified', 'bar', 30, 30),
    ('protein-bar', 'Protein bar', A, ['protein bar', 'protein bars'], (370, 30.0, 12.0, 35.0, 8.0), 'bar', 60, 60),
    ('flapjack', 'Flapjack', A, ['flapjack', 'flapjacks'], 'Flapjacks, retail', 'flapjack', 60, 60),
    ('digestive-biscuit', 'Digestive biscuits', A, ['digestives', 'digestive biscuit', 'biscuits', 'biscuit'], 'Biscuits, digestive, plain', 'biscuit', 15, 30),
    ('chocolate-digestive', 'Chocolate digestive biscuits', A, ['chocolate digestives', 'chocolate biscuits'], 'Biscuits, digestive, half coated in chocolate', 'biscuit', 17, 34),
    ('shortbread', 'Shortbread', A, ['shortbread'], 'Shortbread', 'finger', 20, 40),
    ('cookies', 'Chocolate chip cookies', A, ['cookie', 'cookies', 'chocolate chip cookies'], 'Biscuits, cookies, chocolate chip, standard', 'cookie', 25, 50),
    ('brownie', 'Chocolate brownie', A, ['brownie', 'brownies'], 'Brownies, chocolate, homemade', 'brownie', 60, 60),
    ('cake-sponge', 'Sponge cake with filling', A, ['cake', 'sponge cake', 'victoria sponge', 'birthday cake'], 'Cake, sponge, with butter icing, homemade', 'slice', 65, 65),
    ('ice-cream-vanilla', 'Ice cream, vanilla', FR, ['ice cream', 'vanilla ice cream'], 'Ice cream, dairy, vanilla, soft scoop', 'scoop', 60, 120),
    ('cheesecake', 'Cheesecake', FR, ['cheesecake'], 'Cheesecake, fruit, individual', 'slice', 100, 100),
    ('custard-ready', 'Custard, ready to eat', A, ['custard', 'ready made custard'], 'Custard, ready to eat, canned and tetra-pak', None, None, 125),
    ('jelly-sweets', 'Jelly and chewy sweets', A, ['sweets', 'jelly sweets', 'gummy sweets'], 'Sweets, chew sweets', 'bag', 40, 40),
    ('nuts-mixed', 'Mixed nuts', A, ['mixed nuts', 'nuts'], 'Nuts, mixed', None, None, 30),
    # Spreads and cupboard
    ('peanut-butter-crunchy', 'Peanut butter, crunchy', A, ['crunchy peanut butter'], (615, 24.0, 52.0, 13.0, 7.0), None, None, 20),
    ('chocolate-spread', 'Chocolate spread', A, ['chocolate spread', 'chocolate hazelnut spread'], 'Chocolate spread', None, None, 15),
    ('baked-beans-reduced', 'Baked beans, reduced sugar and salt', A, ['reduced sugar baked beans', 'lower sugar beans'], 'Baked beans, canned in tomato sauce, reduced sugar, reduced salt', 'tin', 415, 200),
    ('tinned-spaghetti', 'Spaghetti in tomato sauce, tinned', A, ['tinned spaghetti', 'spaghetti hoops', 'hoops'], 'Pasta, spaghetti, canned, in tomato sauce', 'tin', 410, 200),
    ('tinned-soup-tomato', 'Cream of tomato soup, tinned', A, ['tomato soup', 'tinned soup', 'cream of tomato soup'], 'Soup, cream of tomato, canned', 'tin', 400, 300),
    ('coleslaw', 'Coleslaw', F, ['coleslaw'], 'Coleslaw, not low calorie, retail', None, None, 50),
    ('gravy-made', 'Gravy, made from granules', A, ['gravy'], 'Gravy instant granules, made up with water', None, None, 70),
    ('stuffing-made', 'Sage and onion stuffing', A, ['stuffing'], 'Stuffing mix, dried, assorted flavours, made up', None, None, 70),
    ('mayonnaise-light', 'Mayonnaise, reduced fat', A, ['light mayonnaise', 'lighter mayonnaise', 'reduced fat mayonnaise', 'light mayo'], 'Mayonnaise, reduced fat', None, None, 15),
    ('salad-cream', 'Salad cream', A, ['salad cream'], 'Salad cream', None, None, 15),
    ('brown-sauce', 'Brown sauce', A, ['brown sauce'], (110, 1.0, 0.1, 25.0, 1.0), None, None, 15),
    ('bbq-sauce', 'Barbecue sauce', A, ['barbecue sauce', 'bbq sauce'], 'Barbecue sauce', None, None, 15),
    ('sweet-chilli-sauce', 'Sweet chilli sauce', A, ['sweet chilli sauce', 'sweet chili sauce'], (230, 0.5, 0.3, 56.0, 0.8), None, None, 15),
    ('cook-in-curry-sauce', 'Curry cooking sauce, jar', A, ['curry sauce', 'tikka masala sauce', 'korma sauce', 'jar of curry sauce'], 'Sauce, Indian cook in, korma/tikka masala', 'jar', 450, 115),
    ('pasta-sauce-jar', 'Tomato pasta sauce, jar', A, ['pasta sauce', 'bolognese sauce', 'tomato pasta sauce', 'jar of pasta sauce'], 'Sauce, pasta, tomato based, for bolognese', 'jar', 500, 125),
    # Shop sandwiches and lunch
    ('sandwich-chicken-salad', 'Sandwich, chicken salad', F, ['chicken sandwich', 'chicken salad sandwich', 'sandwich'], 'Sandwich, white bread, chicken salad', 'sandwich', 190, 190),
    ('sandwich-blt', 'Sandwich, bacon, lettuce and tomato', F, ['blt', 'blt sandwich', 'bacon sandwich'], 'Sandwich, white bread, bacon, lettuce and tomato', 'sandwich', 180, 180),
    ('sandwich-cheese-pickle', 'Sandwich, cheese and pickle', F, ['cheese sandwich', 'cheese and pickle sandwich', 'ploughmans sandwich'], 'Sandwich, white bread, cheddar cheese and pickle', 'sandwich', 170, 170),
    ('sandwich-egg-mayo', 'Sandwich, egg mayonnaise', F, ['egg mayo sandwich', 'egg sandwich', 'egg mayonnaise sandwich'], 'Sandwich, white bread, egg mayonnaise', 'sandwich', 170, 170),
    ('sandwich-ham-salad', 'Sandwich, ham salad', F, ['ham sandwich', 'ham salad sandwich'], 'Sandwich, white bread, ham salad', 'sandwich', 180, 180),
    ('sandwich-tuna-mayo', 'Sandwich, tuna mayonnaise', F, ['tuna sandwich', 'tuna mayo sandwich', 'tuna and sweetcorn sandwich'], 'Sandwich, white bread, tuna mayonnaise', 'sandwich', 180, 180),
    ('falafel', 'Falafel', F, ['falafel', 'falafels'], 'Falafel, fried in rapeseed oil, homemade', 'falafel', 20, 100),
    ('sushi-salmon', 'Sushi, salmon', F, ['sushi', 'salmon sushi', 'sushi box'], 'Sushi, salmon nigiri', 'piece', 30, 180),
    ('quorn-pieces', 'Mycoprotein pieces', FR, ['quorn', 'quorn pieces', 'mycoprotein'], 'Quorn, pieces, as purchased', None, None, 100),
    # Cooked staples people log as eaten
    ('rice-white-cooked', 'Rice, white, cooked', F, ['cooked rice', 'boiled rice', 'steamed rice', 'microwave rice'], 'Rice, white, long grain, boiled in unsalted water', 'pouch', 250, 180),
    ('pasta-cooked', 'Pasta, cooked', F, ['cooked pasta', 'boiled pasta'], 'Pasta, white, dried, boiled in unsalted water', None, None, 220),
    ('mashed-potato', 'Mashed potato', F, ['mashed potato', 'mash'], 'Potatoes, old, mashed with butter', None, None, 180),
    ('roast-potatoes', 'Roast potatoes', F, ['roast potatoes', 'roasties'], 'Potatoes, old, roasted in rapeseed oil', None, None, 200),
    ('jacket-potato', 'Jacket potato', F, ['jacket potato', 'baked potato'], 'Potatoes, old, baked, flesh and skin', 'potato', 220, 220),
    ('eggs-scrambled', 'Scrambled egg', F, ['scrambled egg', 'scrambled eggs'], 'Eggs, chicken, scrambled, with semi-skimmed milk', None, None, 120),
    ('eggs-fried', 'Fried egg', F, ['fried egg', 'fried eggs'], 'Eggs, chicken, whole, fried in sunflower oil', 'egg', 60, 60),
    ('eggs-boiled', 'Boiled egg', F, ['boiled egg', 'boiled eggs', 'poached egg'], 'Eggs, chicken, whole, boiled', 'egg', 50, 100),
    ('omelette-cheese', 'Cheese omelette', F, ['cheese omelette', 'omelette'], 'Omelette, cheese, homemade', None, None, 150),
]

# Typical adult portions for foods already in the reference (raw or dry weight
# as the reference counts them), for the "check the amounts" note.
PORTIONS = {
    'chicken-breast-skinless': 150, 'chicken-thigh-boneless': 150, 'salmon-fillet': 120, 'cod-fillet': 140,
    'sea-bass-fillet': 110, 'beef-mince-5': 125, 'beef-mince-20': 125, 'pork-mince': 125, 'lamb-mince': 125,
    'turkey-mince': 125, 'sausage-pork': 114, 'spaghetti-dry': 75, 'penne-dry': 75, 'rice-basmati-dry': 75,
    'rice-brown-dry': 75, 'rice-arborio-dry': 75, 'egg-noodles-dry': 75, 'rice-noodles-dry': 75, 'couscous-dry': 65,
    'quinoa-dry': 65, 'tofu-firm': 125, 'halloumi': 60, 'prawns-cooked': 100, 'smoked-mackerel': 100,
}

def main():
    cofid = json.load(open(COFID))
    by_name = {row[1]: row for row in cofid['foods']}
    ref = json.load(open(REF))
    mine = {item[0] for item in ITEMS}
    foods = [f for f in ref['foods'] if f.get('slug') not in mine]
    taken = set()
    for f in foods:
        taken.add(f['name'].lower())
        for a in f.get('aliases', []):
            taken.add(a.lower())
    added, skipped_alias, missing = 0, [], []
    for slug, name, cat, aliases, source, label, gpi, portion in ITEMS:
        if isinstance(source, str):
            row = by_name.get(source)
            if not row:
                missing.append((slug, source))
                continue
            _, _, kcal, p, fat, c, fib, _sug, _g = row
            basis = f'CoFID 2019: {source}.'
        else:
            kcal, p, fat, c, fib = source
            basis = 'Typical of UK supermarket labels per 100 g; brands vary.'
        if name.lower() in taken:
            skipped_alias.append(name)
            continue
        clean_aliases = []
        for a in aliases:
            a = a.lower()
            if a == name.lower():
                continue
            if a in taken:
                skipped_alias.append(a)
                continue
            clean_aliases.append(a)
            taken.add(a)
        taken.add(name.lower())
        entry = {
            'slug': slug, 'name': name, 'category': cat, 'aliases': clean_aliases,
            'calories_per_100g': kcal, 'protein_g': p if p is not None else 0.0,
            'fat_g': fat if fat is not None else 0.0, 'carbs_g': c if c is not None else 0.0,
            'fibre_g': fib if fib is not None else 0.0,
            'basis': basis, 'everyday': True
        }
        if label: entry['item_label'] = label
        if gpi: entry['grams_per_item'] = gpi
        if portion: entry['portion_g'] = portion
        foods.append(entry)
        added += 1
    for f in foods:
        if f.get('slug') in PORTIONS: f['portion_g'] = PORTIONS[f['slug']]
    ref['foods'] = foods
    ref['version'] = 4
    ref['updated'] = '2026-10-04'
    ref['note'] = (ref.get('note', '') .split(' v4:')[0]
        + " v4 (4 Oct 2026): everyday shop-bought and takeaway foods, generic, from CoFID 2019 (OGL v3.0) where it has them; portion_g is a typical adult portion.")
    json.dump(ref, open(REF, 'w'), indent=1, ensure_ascii=False)
    open(REF, 'a').write('\n')
    print('added', added, 'of', len(ITEMS))
    if missing: print('NOT IN COFID:', missing)
    if skipped_alias: print('aliases already used elsewhere (kept the existing):', skipped_alias)

if __name__ == '__main__':
    main()
