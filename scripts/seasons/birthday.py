# scripts/seasons/birthday.py — 27 Nov 2026 v1
# Birthdays: party food for grown-ups and children, cakes worth candles,
# and something for every diet round the table.
from build import Book

b = Book('birthday', 'Birthday', 'bday')
R, M = b.R, b.M

# ---- Starters: party bites ----
R('pitta-pizzas', 'Pitta bread pizzas', 'starter',
  ['pitta-bread 6', 'passata 150g', 'dried-oregano 1tsp', 'mozzarella 1', 'cherry-tomato 8', 'fresh-basil 5g'],
  ['Heat the oven to 200C. Lay {pitta-bread} on a tray.',
   'Mix {passata} with {dried-oregano}. Spread over the pittas.',
   'Tear over {mozzarella}. Add halved {cherry-tomato}.',
   'Bake 10 minutes, until the cheese bubbles.',
   'Scatter with {fresh-basil}. Cut into quarters.'],
  serves=6, tier='budget', note='Children can make their own. Lay the toppings out in bowls.')

R('cheese-straws', 'Cheese straws', 'starter',
  ['puff-pastry 320g', 'egg-medium 1', 'cheddar-cheese 100g', 'paprika 0.5tsp'],
  ['Heat the oven to 200C. Unroll {puff-pastry}.',
   'Brush with beaten {egg-medium}.',
   'Scatter half with grated {cheddar-cheese} and {paprika}. Fold the other half over. Press down.',
   'Cut into 1 cm strips. Twist each one.',
   'Lay on a lined tray. Bake 12 minutes, until golden and crisp.'],
  serves=8, tier='budget')

R('honey-mustard-sausages', 'Honey and mustard cocktail sausages', 'starter',
  ['chipolatas 24', 'honey 2tbsp', 'wholegrain-mustard 1tbsp', 'sesame-seeds 1tbsp'],
  ['Heat the oven to 200C. Twist each of {chipolatas} in the middle to make two.',
   'Snip apart. Roast on a tray 20 minutes.',
   'Mix {honey} and {wholegrain-mustard}. Toss with the hot sausages.',
   'Roast 5 minutes more, until sticky.',
   'Scatter with {sesame-seeds}. Serve on sticks.'],
  serves=8, tier='budget')

R('chicken-satay', 'Chicken satay skewers', 'starter',
  ['chicken-breast-skinless 2', 'soy-sauce 2tbsp', 'curry-powder 1tsp', 'peanut-butter 4tbsp', 'coconut-milk-tinned 1', 'lime 1', 'sweet-chilli-sauce 1tbsp'],
  ['Cut {chicken-breast-skinless} into strips. Toss with {soy-sauce} and {curry-powder}.',
   'Thread onto skewers.',
   'Grill on a high heat 8 minutes, turning, until cooked through.',
   '## Sauce',
   'Warm {peanut-butter} with half of {coconut-milk-tinned} until smooth.',
   'Stir in the juice of {lime} and {sweet-chilli-sauce}. Serve for dipping.'],
  serves=6, tier='everyday', note='Peanuts: tell guests, and keep these well apart if anyone has an allergy.')

R('prawn-toast', 'Sesame prawn toasts', 'starter',
  ['king-prawns-raw 200g', 'spring-onion 2', 'ginger-fresh 1tsp', 'egg-white 1', 'soy-sauce 1tsp', 'bread-slice-medium 4', 'sesame-seeds 3tbsp', 'vegetable-oil 6tbsp'],
  ['Blend {king-prawns-raw}, {spring-onion}, {ginger-fresh}, {egg-white} and {soy-sauce} to a paste.',
   'Spread thickly over {bread-slice-medium}.',
   'Press the paste side into {sesame-seeds}.',
   'Shallow-fry in {vegetable-oil}, paste side down, 2 minutes. Turn. Fry 1 minute more.',
   'Drain on kitchen paper. Cut into triangles.'],
  serves=6, tier='everyday')

R('salmon-pinwheels', 'Smoked salmon pinwheels', 'starter',
  ['tortilla-wrap 4', 'cream-cheese 200g', 'fresh-dill 10g', 'lemon 1', 'smoked-salmon 200g', 'cucumber 1'],
  ['Mix {cream-cheese} with chopped {fresh-dill} and the zest of {lemon}.',
   'Spread over {tortilla-wrap}.',
   'Lay {smoked-salmon} on top. Add thin strips of {cucumber}.',
   'Roll up tightly. Wrap in cling film. Chill 1 hour.',
   'Slice into rounds.'],
  serves=8, tier='everyday')

R('loaded-nachos', 'Loaded nachos with guacamole and salsa', 'starter',
  ['tortilla-chips 200g', 'black-beans-tinned 1', 'cumin-ground 1tsp', 'salsa-dip 200g', 'guacamole 200g', 'spring-onion 3', 'chilli-fresh 1'],
  ['Heat the oven to 180C. Spread {tortilla-chips} on a tray.',
   'Drain {black-beans-tinned}. Toss with {cumin-ground}. Scatter over.',
   'Bake 8 minutes, until warm.',
   'Spoon over {salsa-dip} and {guacamole}.',
   'Scatter sliced {spring-onion} and {chilli-fresh}.'],
  serves=6, tier='budget')

R('hummus-cups', 'Hummus and crudité cups', 'starter',
  ['hummus 300g', 'carrot-medium 3', 'cucumber 1', 'pepper-bell 2', 'breadsticks 12'],
  ['Spoon {hummus} into the bottom of 6 small cups.',
   'Cut {carrot-medium}, {cucumber} and {pepper-bell} into long sticks.',
   'Stand the sticks and {breadsticks} in the hummus.'],
  serves=6, tier='budget', note='One cup each means no double dipping.')

# ---- Mains ----
R('beef-burgers', 'Homemade beef burgers', 'main',
  ['beef-mince-20-fat 600g', 'onion-medium 1', 'mustard-dijon 1tsp', 'salt 1tsp', 'burger-bun 4', 'cheddar-cheese 80g', 'lettuce-iceberg 150g', 'tomato-medium 2'],
  ['Grate {onion-medium}. Mix into {beef-mince-20-fat} with {mustard-dijon} and {salt}.',
   'Shape into 4 burgers, a little wider than {burger-bun}. Press a dip in the middle.',
   'Put a griddle pan on a high heat.',
   'Cook the burgers 4 minutes each side.',
   'Add a slice of {cheddar-cheese} for the last minute.',
   'Serve in toasted buns with {lettuce-iceberg} and sliced {tomato-medium}.'],
  serves=4, tier='everyday', note='The dip stops them doming as they cook.')

R('chicken-fajitas', 'Chicken fajitas', 'main',
  ['chicken-breast-skinless 3', 'pepper-bell 3', 'red-onion 1', 'smoked-paprika 2tsp', 'cumin-ground 1tsp', 'olive-oil 2tbsp', 'lime 1', 'tortilla-wrap 8', 'soured-cream 150ml'],
  ['Slice {chicken-breast-skinless}, {pepper-bell} and {red-onion} into strips.',
   'Toss with {smoked-paprika}, {cumin-ground} and {olive-oil}.',
   'Put a large frying pan on a high heat.',
   'Fry 10 minutes, stirring, until the chicken is cooked and the peppers charred.',
   'Squeeze over {lime}.',
   'Serve in warm {tortilla-wrap} with {soured-cream}.'],
  serves=4, tier='everyday')

R('spaghetti-meatballs', 'Spaghetti and meatballs', 'main',
  ['beef-mince-5-fat 500g', 'breadcrumbs-dried 40g', 'egg-medium 1', 'parmesan 40g', 'olive-oil 2tbsp', 'garlic-clove 2', 'passata 700g', 'fresh-basil 10g', 'spaghetti-dry 400g'],
  ['Mix {beef-mince-5-fat}, {breadcrumbs-dried}, {egg-medium} and half of {parmesan}. Roll 20 balls.',
   'Brown in {olive-oil} 8 minutes, turning. Lift out.',
   'Fry sliced {garlic-clove} 1 minute. Add {passata}. Simmer 10 minutes.',
   'Return the meatballs. Simmer 15 minutes, until cooked through.',
   'Cook {spaghetti-dry} for the time on the packet.',
   'Serve with the sauce, torn {fresh-basil} and the rest of the parmesan.'],
  serves=4, tier='budget')

R('fish-fingers', 'Homemade fish fingers', 'main',
  ['cod-fillet 3', 'flour-plain 3tbsp', 'egg-medium 1', 'panko 80g', 'vegetable-oil 3tbsp', 'lemon 1', 'mayonnaise 4tbsp'],
  ['Heat the oven to 220C. Cut {cod-fillet} into thick fingers.',
   'Roll in {flour-plain}. Dip in beaten {egg-medium}. Press into {panko}.',
   'Lay on an oiled tray. Drizzle with {vegetable-oil}.',
   'Bake 15 minutes, turning once, until golden.',
   'Stir the zest of {lemon} into {mayonnaise} for dipping.'],
  serves=4, tier='everyday')

R('salmon-teriyaki', 'Sticky salmon teriyaki with rice', 'main',
  ['rice-jasmine-dry 300g', 'soy-sauce 4tbsp', 'honey 2tbsp', 'mirin 2tbsp', 'ginger-fresh 1tsp', 'salmon-fillet 4', 'broccoli-head 1', 'sesame-seeds 1tbsp'],
  ['Cook {rice-jasmine-dry} for the time on the packet.',
   'Mix {soy-sauce}, {honey}, {mirin} and {ginger-fresh}.',
   'Fry {salmon-fillet} skin side down 4 minutes. Turn.',
   'Pour in the sauce. Bubble 3 minutes, spooning it over, until sticky.',
   'Steam {broccoli-head} florets 4 minutes.',
   'Serve with the rice. Sprinkle {sesame-seeds}.'],
  serves=4, tier='everyday')

R('prawn-paella', 'King prawn and pea paella', 'main',
  ['olive-oil 3tbsp', 'onion-medium 1', 'pepper-bell 1', 'garlic-clove 2', 'smoked-paprika 1tsp', 'saffron 0.25tsp', 'rice-arborio-dry 300g', 'stock-vegetable 900ml', 'king-prawns-raw 400g', 'peas-frozen 150g', 'lemon 1'],
  ['Fry chopped {onion-medium} and {pepper-bell} in {olive-oil} in a wide pan 8 minutes.',
   'Add {garlic-clove}, {smoked-paprika} and {saffron}. Fry 1 minute.',
   'Stir in {rice-arborio-dry}. Add {stock-vegetable}. Do not stir again.',
   'Simmer 15 minutes.',
   'Push {king-prawns-raw} and {peas-frozen} into the rice. Cook 5 minutes, until the prawns are pink.',
   'Rest 5 minutes. Serve with {lemon} wedges.'],
  serves=4, tier='everyday', note='No stirring after the stock goes in. The crust on the bottom is the best bit.')

R('quick-pizza', 'Quick margherita pizza', 'main',
  ['flour-self-raising 300g', 'greek-yoghurt 300g', 'passata 200g', 'garlic-clove 1', 'mozzarella 2', 'fresh-basil 10g', 'olive-oil 1tbsp'],
  ['Heat the oven to 240C.',
   'Mix {flour-self-raising} and {greek-yoghurt} to a soft dough. Knead 1 minute.',
   'Split in two. Roll each thinly. Lay on oiled trays.',
   'Spread with {passata} mixed with crushed {garlic-clove}.',
   'Tear over {mozzarella}. Drizzle with {olive-oil}.',
   'Bake 12 minutes, until crisp. Scatter {fresh-basil}.'],
  serves=4, tier='budget', note='No yeast and no waiting: the yoghurt makes it rise.')

R('halloumi-fajitas', 'Halloumi fajitas', 'main',
  ['halloumi 2', 'pepper-bell 3', 'red-onion 1', 'smoked-paprika 2tsp', 'olive-oil 2tbsp', 'tortilla-wrap 8', 'guacamole 200g', 'lime 1'],
  ['Cut {halloumi} into fingers. Slice {pepper-bell} and {red-onion}.',
   'Toss the vegetables with {smoked-paprika} and {olive-oil}.',
   'Fry in a hot pan 8 minutes, until charred. Push to one side.',
   'Fry the halloumi 2 minutes each side, until golden.',
   'Squeeze over {lime}.',
   'Serve in warm {tortilla-wrap} with {guacamole}.'],
  serves=4, tier='everyday')

R('bean-quesadillas', 'Cheesy bean quesadillas', 'main',
  ['kidney-beans-tinned 1', 'sweetcorn-tinned 1', 'cumin-ground 1tsp', 'tortilla-wrap 8', 'cheddar-cheese 150g', 'salsa-dip 200g'],
  ['Drain {kidney-beans-tinned} and {sweetcorn-tinned}. Mash the beans roughly with {cumin-ground}.',
   'Spread over 4 of {tortilla-wrap}. Scatter sweetcorn and grated {cheddar-cheese}.',
   'Top with the other wraps.',
   'Cook in a dry frying pan 3 minutes each side, until crisp and melted.',
   'Cut into wedges. Serve with {salsa-dip}.'],
  serves=4, tier='budget')

R('bean-burgers', 'Spiced black bean burgers', 'main',
  ['black-beans-tinned 2', 'red-onion 1', 'garlic-clove 1', 'cumin-ground 1tsp', 'smoked-paprika 1tsp', 'breadcrumbs-dried 60g', 'olive-oil 2tbsp', 'bread-roll-white 4', 'avocado 1', 'tomato-medium 2'],
  ['Drain {black-beans-tinned}. Mash in a bowl, leaving some whole.',
   'Grate in {red-onion} and {garlic-clove}. Add {cumin-ground}, {smoked-paprika} and {breadcrumbs-dried}.',
   'Shape into 4 burgers. Chill 20 minutes.',
   'Fry in {olive-oil} 4 minutes each side, until crisp.',
   'Serve in {bread-roll-white} with sliced {avocado} and {tomato-medium}.'],
  serves=4, tier='budget', note='Chilling firms them so they hold together in the pan.')

R('sweet-potato-tacos', 'Sweet potato and black bean tacos', 'main',
  ['sweet-potato 2', 'olive-oil 2tbsp', 'chilli-powder 1tsp', 'black-beans-tinned 1', 'tortilla-wrap 8', 'red-cabbage 150g', 'lime 2', 'fresh-coriander 10g'],
  ['Heat the oven to 200C. Dice {sweet-potato}. Toss with {olive-oil} and {chilli-powder}.',
   'Roast 25 minutes, until soft and charred.',
   'Warm drained {black-beans-tinned} in a pan.',
   'Shred {red-cabbage}. Toss with the juice of one {lime}.',
   'Fill warm {tortilla-wrap} with potato, beans and cabbage.',
   'Top with {fresh-coriander}. Serve with lime wedges.'],
  serves=4, tier='budget')

R('lentil-bolognese', 'Lentil bolognese', 'main',
  ['olive-oil 2tbsp', 'onion-medium 1', 'carrot-medium 2', 'celery-stick 2', 'garlic-clove 2', 'lentils-red-dry 200g', 'chopped-tomatoes-tinned 2', 'stock-vegetable 400ml', 'dried-oregano 1tsp', 'spaghetti-dry 400g'],
  ['Chop {onion-medium}, {carrot-medium} and {celery-stick} finely.',
   'Fry in {olive-oil} 10 minutes, until soft.',
   'Add {garlic-clove}. Fry 1 minute.',
   'Add {lentils-red-dry}, {chopped-tomatoes-tinned}, {stock-vegetable} and {dried-oregano}.',
   'Simmer 25 minutes, until thick.',
   'Cook {spaghetti-dry} for the time on the packet. Serve with the sauce.'],
  serves=6, tier='budget')

# ---- Sides ----
R('potato-wedges', 'Crispy potato wedges', 'side',
  ['potato-large 4', 'olive-oil 3tbsp', 'smoked-paprika 1tsp', 'salt 1tsp'],
  ['Heat the oven to 220C.',
   'Cut {potato-large} into wedges, skin on.',
   'Toss with {olive-oil}, {smoked-paprika} and {salt}.',
   'Roast 35 minutes, turning once, until crisp.'],
  serves=6, tier='budget')

R('rainbow-slaw', 'Rainbow slaw', 'side',
  ['red-cabbage 250g', 'carrot-medium 2', 'pepper-bell 1', 'spring-onion 3', 'lime 1', 'olive-oil 2tbsp'],
  ['Shred {red-cabbage}. Grate {carrot-medium}.',
   'Slice {pepper-bell} and {spring-onion} thinly.',
   'Toss with the juice of {lime} and {olive-oil}.'],
  serves=6, tier='budget')

R('garlic-bread', 'Homemade garlic bread', 'side',
  ['butter-unsalted 100g', 'garlic-clove 3', 'fresh-parsley 10g', 'sourdough 8'],
  ['Heat the oven to 200C.',
   'Mash soft {butter-unsalted} with crushed {garlic-clove} and chopped {fresh-parsley}.',
   'Spread over {sourdough}.',
   'Wrap in foil. Bake 10 minutes. Open the foil. Bake 5 minutes more.'],
  serves=8, tier='budget')

R('green-salad', 'Simple green salad', 'side',
  ['cos-lettuce 200g', 'cucumber 1', 'mustard-dijon 1tsp', 'white-wine-vinegar 1tbsp', 'olive-oil 3tbsp'],
  ['Tear {cos-lettuce} into a bowl. Slice in {cucumber}.',
   'Whisk {mustard-dijon}, {white-wine-vinegar} and {olive-oil}.',
   'Toss as you serve.'],
  serves=6, tier='budget')

R('sweetcorn-salsa', 'Sweetcorn and tomato salsa', 'side',
  ['sweetcorn-tinned 1', 'cherry-tomato 16', 'red-onion 1', 'lime 1', 'fresh-coriander 10g'],
  ['Drain {sweetcorn-tinned}.',
   'Quarter {cherry-tomato}. Chop {red-onion} finely.',
   'Mix with the juice of {lime} and chopped {fresh-coriander}.'],
  serves=6, tier='budget')

# ---- Puddings: cakes and treats ----
R('chocolate-birthday-cake', 'Chocolate birthday cake', 'pudding',
  ['butter-unsalted 300g', 'sugar-caster 225g', 'egg-medium 4', 'flour-self-raising 200g', 'cocoa-powder 75g', 'milk-whole 4tbsp', 'icing-sugar 250g', 'dark-chocolate 100g'],
  ['Heat the oven to 180C. Line two 20 cm tins.',
   'Beat 225 g of {butter-unsalted} with {sugar-caster} until pale.',
   'Beat in {egg-medium}. Fold in {flour-self-raising}, 50 g of {cocoa-powder} and {milk-whole}.',
   'Divide between the tins. Bake 25 minutes, until springy. Cool.',
   '## Icing',
   'Beat the rest of the butter with {icing-sugar}, the rest of the cocoa and melted {dark-chocolate}.',
   'Sandwich and cover the cakes. Add candles.'],
  serves=12, tier='everyday')

R('funfetti-cake', 'Sprinkle vanilla birthday cake', 'pudding',
  ['butter-unsalted 375g', 'sugar-caster 225g', 'egg-medium 4', 'flour-self-raising 225g', 'vanilla-extract 2tsp', 'sprinkles 4tbsp', 'icing-sugar 300g', 'milk-whole 2tbsp'],
  ['Heat the oven to 180C. Line two 20 cm tins.',
   'Beat 225 g of {butter-unsalted} with {sugar-caster}. Beat in {egg-medium}.',
   'Fold in {flour-self-raising}, half of {vanilla-extract} and half of {sprinkles}.',
   'Divide between the tins. Bake 25 minutes. Cool.',
   'Beat the rest of the butter, {icing-sugar}, {milk-whole} and the rest of the vanilla until fluffy.',
   'Sandwich and cover. Shower with the rest of the sprinkles.'],
  serves=12, tier='everyday')

R('brownies', 'Fudgy chocolate brownies', 'pudding',
  ['dark-chocolate 200g', 'butter-unsalted 175g', 'sugar-caster 275g', 'egg-medium 3', 'flour-plain 75g', 'cocoa-powder 40g'],
  ['Heat the oven to 180C. Line a 20 cm square tin.',
   'Melt {dark-chocolate} and {butter-unsalted} together. Cool a little.',
   'Whisk {sugar-caster} and {egg-medium} until thick and pale.',
   'Fold in the chocolate, then {flour-plain} and {cocoa-powder}.',
   'Bake 25 minutes, until set at the edges with a slight wobble.',
   'Cool in the tin before cutting into 16.'],
  serves=12, tier='budget', note='They firm up as they cool. Underbaked is right.')

R('cupcakes', 'Vanilla cupcakes with buttercream', 'pudding',
  ['butter-unsalted 275g', 'sugar-caster 125g', 'egg-medium 2', 'flour-self-raising 125g', 'vanilla-extract 1tsp', 'icing-sugar 250g', 'sprinkles 2tbsp'],
  ['Heat the oven to 180C. Put 12 cases in a bun tin.',
   'Beat 125 g of {butter-unsalted} with {sugar-caster}. Beat in {egg-medium}.',
   'Fold in {flour-self-raising} and {vanilla-extract}.',
   'Divide between the cases. Bake 18 minutes. Cool.',
   'Beat the rest of the butter with {icing-sugar} until fluffy.',
   'Pipe or spread on top. Add {sprinkles}.'],
  serves=12, tier='budget')

R('rocky-road', 'Rocky road', 'pudding',
  ['milk-chocolate-bar 4', 'dark-chocolate 100g', 'butter-unsalted 100g', 'golden-syrup 3tbsp', 'digestive-biscuit 12', 'marshmallows 15', 'glace-cherries 60g'],
  ['Line a 20 cm square tin.',
   'Melt {milk-chocolate-bar}, {dark-chocolate}, {butter-unsalted} and {golden-syrup} together.',
   'Break {digestive-biscuit} into pieces. Halve {marshmallows} and {glace-cherries}.',
   'Stir everything into the chocolate.',
   'Press into the tin. Chill 2 hours, until firm. Cut into squares.'],
  serves=12, tier='budget', note='Most marshmallows have gelatine in them, so this is not vegetarian.')

R('sundaes', 'Build-your-own ice cream sundaes', 'pudding',
  ['ice-cream-vanilla 8', 'strawberries 200g', 'dark-chocolate 80g', 'double-cream 100ml', 'sprinkles 2tbsp'],
  ['Melt {dark-chocolate} into warm {double-cream} for a sauce.',
   'Slice {strawberries}.',
   'Put scoops of {ice-cream-vanilla} in glasses.',
   'Let everyone add strawberries, sauce and {sprinkles}.'],
  serves=4, tier='budget')

R('vegan-chocolate-cake', 'Vegan chocolate birthday cake', 'pudding',
  ['flour-plain 300g', 'sugar-caster 250g', 'cocoa-powder 75g', 'bicarbonate-of-soda 2tsp', 'oat-milk 350ml', 'vegetable-oil 100ml', 'white-wine-vinegar 1tbsp', 'dairy-free-spread 150g', 'icing-sugar 300g'],
  ['Heat the oven to 180C. Line two 20 cm tins.',
   'Mix {flour-plain}, {sugar-caster}, 50 g of {cocoa-powder} and {bicarbonate-of-soda}.',
   'Whisk {oat-milk}, {vegetable-oil} and {white-wine-vinegar}. Stir into the flour.',
   'Divide between the tins. Bake 30 minutes. Cool.',
   'Beat {dairy-free-spread} with {icing-sugar} and the rest of the cocoa.',
   'Sandwich and cover the cakes.'],
  serves=12, tier='budget', note='The vinegar and bicarbonate make it rise without eggs.')

R('fruit-skewers', 'Rainbow fruit skewers with chocolate dip', 'pudding',
  ['strawberries 200g', 'pineapple 1', 'kiwi 3', 'blueberries 150g', 'grapes 200g', 'dark-chocolate-70 100g'],
  ['Hull {strawberries}. Peel and chunk half of {pineapple} and {kiwi}.',
   'Thread onto skewers in rainbow order with {grapes} and {blueberries}.',
   'Melt {dark-chocolate-70} over a pan of barely simmering water.',
   'Serve the skewers with the chocolate for dipping.'],
  serves=8, tier='budget')

R('vegan-cookies', 'Vegan chocolate chip cookies', 'pudding',
  ['dairy-free-spread 125g', 'sugar-soft-brown 150g', 'oat-milk 3tbsp', 'vanilla-extract 1tsp', 'flour-plain 200g', 'bicarbonate-of-soda 0.5tsp', 'dark-chocolate-70 100g'],
  ['Heat the oven to 180C. Line two trays.',
   'Beat {dairy-free-spread} and {sugar-soft-brown}. Add {oat-milk} and {vanilla-extract}.',
   'Stir in {flour-plain} and {bicarbonate-of-soda}.',
   'Chop {dark-chocolate-70}. Stir in.',
   'Roll 16 balls. Space well apart on the trays.',
   'Bake 11 minutes, until golden at the edges. Cool on the trays.'],
  serves=12, tier='budget')

# ---- Drinks ----
R('pink-lemonade', 'Pink lemonade', 'drink',
  ['raspberries 100g', 'lemon 3', 'sugar-caster 100g', 'sparkling-water 2'],
  ['Crush {raspberries} with {sugar-caster} and the juice of {lemon}.',
   'Sieve into a jug.',
   'Top up with {sparkling-water} and ice.'],
  serves=8, tier='budget')

R('strawberry-milkshake', 'Strawberry milkshake', 'drink',
  ['strawberries 250g', 'milk-whole 500ml', 'ice-cream-vanilla 4'],
  ['Hull {strawberries}.',
   'Blend with {milk-whole} and {ice-cream-vanilla} until frothy.',
   'Pour into glasses with straws.'],
  serves=4, tier='budget')

R('raspberry-fizz', 'Raspberry sparkling fizz', 'drink',
  ['raspberries 100g', 'orange-liqueur 40ml', 'sparkling-wine 750ml'],
  ['Put 3 {raspberries} in each glass.',
   'Add a little {orange-liqueur}.',
   'Top up with chilled {sparkling-wine}.'],
  serves=6, tier='everyday')

R('rum-punch', 'Birthday rum punch', 'drink',
  ['spirit-40 200ml', 'pineapple 1', 'orange-juice 500ml', 'lime 2', 'ginger-ale 500ml'],
  ['Pour {spirit-40} and {orange-juice} into a big jug.',
   'Add the juice of {lime}.',
   'Chunk half of {pineapple}. Add.',
   'Top up with {ginger-ale} and lots of ice.'],
  serves=8, tier='everyday', note='The spirit is rum. Make a jug without it for the drivers.')

# ---- Menus ----
PINK = ('Pink lemonade', 'bday-pink-lemonade')
SHAKE = ('Strawberry milkshake', 'bday-strawberry-milkshake')
FIZZ = ('Raspberry sparkling fizz', 'bday-raspberry-fizz')
PUNCH = ('Birthday rum punch', 'bday-rum-punch')

M('burger-party', 'Burger birthday', 'meat', 4, 'Cocktail sausages, homemade burgers with wedges, chocolate birthday cake.',
  ('bday-honey-mustard-sausages', PINK, 'A cold lager'),
  ('bday-beef-burgers', SHAKE, 'A Malbec or Zinfandel', ['bday-potato-wedges', 'bday-rainbow-slaw']),
  ('bday-chocolate-birthday-cake', 'Cold milk', FIZZ))
M('fajita-party', 'Fajita party', 'meat', 4, 'Loaded nachos, chicken fajitas, rocky road.',
  ('bday-loaded-nachos', PINK, 'A Mexican-style lager with lime'),
  ('bday-chicken-fajitas', 'Lime and mint sparkling water', 'A Tempranillo', ['bday-sweetcorn-salsa', 'bday-green-salad']),
  ('bday-rocky-road', SHAKE, PUNCH))
M('meatball-party', 'Meatballs and cake', 'meat', 4, 'Chicken satay skewers, spaghetti and meatballs, sprinkle birthday cake.',
  ('bday-chicken-satay', PINK, 'A dry Riesling'),
  ('bday-spaghetti-meatballs', 'Cloudy lemonade', 'A Chianti', ['bday-garlic-bread', 'bday-green-salad']),
  ('bday-funfetti-cake', SHAKE, FIZZ))
M('fish-finger-party', 'Fish finger feast', 'fish', 4, 'Salmon pinwheels, homemade fish fingers with wedges, ice cream sundaes.',
  ('bday-salmon-pinwheels', PINK, FIZZ),
  ('bday-fish-fingers', 'Cloudy lemonade', 'A Sauvignon Blanc', ['bday-potato-wedges', 'bday-green-salad']),
  ('bday-sundaes', SHAKE, PUNCH))
M('teriyaki-party', 'Teriyaki birthday', 'fish', 4, 'Salmon pinwheels, sticky salmon teriyaki, brownies.',
  ('bday-salmon-pinwheels', PINK, 'A Prosecco'),
  ('bday-salmon-teriyaki', 'Jasmine iced tea', 'An off-dry Riesling'),
  ('bday-brownies', SHAKE, PUNCH))
M('paella-party', 'Paella party', 'shellfish', 4, 'Sesame prawn toasts, king prawn paella, brownies.',
  ('bday-prawn-toast', PINK, 'A chilled cava'),
  ('bday-prawn-paella', 'Lime and mint sparkling water', 'An Albariño or dry rosé', ['bday-green-salad']),
  ('bday-brownies', 'Cold milk', FIZZ))
M('pizza-party', 'Pizza party', 'vegetarian', 4, 'Cheese straws, quick margherita pizza, cupcakes.',
  ('bday-cheese-straws', PINK, 'A Prosecco'),
  ('bday-quick-pizza', 'Cloudy lemonade', 'A Chianti or Montepulciano', ['bday-green-salad']),
  ('bday-cupcakes', SHAKE, FIZZ))
M('halloumi-party', 'Halloumi fajita party', 'vegetarian', 4, 'Pitta pizzas, halloumi fajitas, sprinkle birthday cake.',
  ('bday-pitta-pizzas', PINK, 'A Mexican-style lager with lime'),
  ('bday-halloumi-fajitas', 'Lime and mint sparkling water', 'A dry rosé', ['bday-sweetcorn-salsa', 'bday-rainbow-slaw']),
  ('bday-funfetti-cake', SHAKE, PUNCH))
M('quesadilla-party', 'Quesadilla party', 'vegetarian', 4, 'Loaded nachos, cheesy bean quesadillas, ice cream sundaes.',
  ('bday-loaded-nachos', PINK, 'A cold lager'),
  ('bday-bean-quesadillas', 'Cloudy lemonade', 'A Garnacha', ['bday-sweetcorn-salsa']),
  ('bday-sundaes', SHAKE, FIZZ))
M('bean-burger-vegan', 'Vegan burger birthday', 'vegan', 4, 'Loaded nachos, black bean burgers with wedges, vegan chocolate cake.',
  ('bday-loaded-nachos', PINK, 'A cold lager'),
  ('bday-bean-burgers', 'Lime and mint sparkling water', 'A Zinfandel', ['bday-potato-wedges', 'bday-rainbow-slaw']),
  ('bday-vegan-chocolate-cake', 'Oat milk, cold', PUNCH))
M('taco-vegan', 'Taco party', 'vegan', 4, 'Hummus cups, sweet potato and black bean tacos, rainbow fruit skewers.',
  ('bday-hummus-cups', PINK, 'A Mexican-style lager with lime'),
  ('bday-sweet-potato-tacos', 'Lime and mint sparkling water', 'A Grenache rosé', ['bday-sweetcorn-salsa']),
  ('bday-fruit-skewers', 'Cold oat milk', PUNCH))
M('bolognese-vegan', 'Spaghetti party', 'vegan', 6, 'Hummus cups, lentil bolognese, vegan chocolate chip cookies.',
  ('bday-hummus-cups', PINK, 'A Prosecco'),
  ('bday-lentil-bolognese', 'Cloudy lemonade', 'A Sangiovese', ['bday-green-salad']),
  ('bday-vegan-cookies', 'Cold oat milk', FIZZ))
