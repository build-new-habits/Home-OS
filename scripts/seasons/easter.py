# scripts/seasons/easter.py — 27 Nov 2026 v1
# Easter: lamb and ham, eggs, spring vegetables, hot cross buns, simnel
# cake and chocolate.
from build import Book

b = Book('easter', 'Easter', 'eas')
R, M = b.R, b.M

# ---- Starters ----
R('devilled-eggs', 'Devilled eggs', 'starter',
  ['egg-medium 6', 'mayonnaise 3tbsp', 'mustard-dijon 1tsp', 'smoked-paprika 0.5tsp', 'chives 5g'],
  ['Boil {egg-medium} 9 minutes. Cool in cold water. Peel.',
   'Halve lengthways. Scoop the yolks into a bowl.',
   'Mash the yolks with {mayonnaise} and {mustard-dijon} until smooth.',
   'Spoon back into the whites.',
   'Dust with {smoked-paprika}. Snip over {chives}.'],
  serves=6, tier='budget')

R('smoked-salmon-pate', 'Smoked salmon and dill pâté', 'starter',
  ['smoked-salmon 200g', 'cream-cheese 200g', 'lemon 1', 'fresh-dill 10g', 'black-pepper-ground 0.5tsp', 'oatcakes 12'],
  ['Chop {smoked-salmon}.',
   'Beat {cream-cheese} with the zest and juice of {lemon}.',
   'Fold in the salmon and chopped {fresh-dill}.',
   'Season with {black-pepper-ground}. Chill 30 minutes.',
   'Serve with {oatcakes}.'],
  serves=6, tier='everyday')

R('crab-avocado', 'Crab and avocado with lime', 'starter',
  ['crab-white-meat 200g', 'avocado 2', 'lime 2', 'chilli-fresh 1', 'fresh-coriander 10g', 'olive-oil 1tbsp'],
  ['Halve, stone and dice {avocado}. Toss with the juice of one {lime}.',
   'Put {crab-white-meat} in a bowl. Pick out any shell.',
   'Chop {chilli-fresh} and {fresh-coriander}. Stir into the crab with {olive-oil}.',
   'Spoon the avocado into glasses. Top with the crab.',
   'Serve with wedges of the other lime.'],
  serves=4, tier='special')

R('carrot-ginger-soup', 'Carrot and ginger soup', 'starter',
  ['olive-oil 2tbsp', 'onion-medium 1', 'ginger-fresh 1tbsp', 'carrot-large 6', 'stock-vegetable 1000ml', 'coconut-milk-tinned 1', 'fresh-coriander 10g'],
  ['Fry chopped {onion-medium} in {olive-oil} 8 minutes.',
   'Add {ginger-fresh}. Fry 1 minute.',
   'Slice {carrot-large}. Add with {stock-vegetable}. Simmer 20 minutes, until soft.',
   'Add {coconut-milk-tinned}. Blend until smooth.',
   'Scatter with {fresh-coriander}.'],
  serves=6, tier='budget')

R('pea-hummus', 'Pea and mint hummus with crudités', 'starter',
  ['peas-frozen 300g', 'chickpeas-tinned 1', 'tahini 2tbsp', 'lemon 1', 'garlic-clove 1', 'fresh-mint 10g', 'olive-oil 3tbsp', 'carrot-medium 3', 'radish 12'],
  ['Cook {peas-frozen} in boiling water 3 minutes. Cool under cold water.',
   'Drain {chickpeas-tinned}.',
   'Blend the peas, chickpeas, {tahini}, the juice of {lemon} and {garlic-clove}.',
   'Add {fresh-mint} and {olive-oil}. Blend until smooth.',
   'Cut {carrot-medium} into sticks. Halve {radish}. Serve for dipping.'],
  serves=6, tier='budget')

R('pea-ham-soup', 'Pea and ham soup', 'starter',
  ['butter-unsalted 25g', 'onion-medium 1', 'peas-frozen 500g', 'stock-chicken 900ml', 'ham-slice 6', 'fresh-mint 5g'],
  ['Melt {butter-unsalted} in a pan. Chop {onion-medium}. Fry 8 minutes.',
   'Add {peas-frozen} and {stock-chicken}. Simmer 5 minutes.',
   'Blend until smooth.',
   'Shred {ham-slice}. Stir in most of it.',
   'Top with the rest of the ham and {fresh-mint}.'],
  serves=4, tier='budget')

R('lamb-flatbreads', 'Spiced lamb flatbreads', 'starter',
  ['lamb-mince 300g', 'olive-oil 1tbsp', 'cumin-ground 1tsp', 'cinnamon-ground 0.5tsp', 'pitta-bread 4', 'natural-yoghurt 150g', 'pomegranate-seeds 50g', 'fresh-mint 10g'],
  ['Put a frying pan on a high heat. Add {olive-oil}.',
   'Fry {lamb-mince} 8 minutes, breaking it up, until browned.',
   'Add {cumin-ground} and {cinnamon-ground}. Fry 1 minute.',
   'Warm {pitta-bread}. Cut each into four.',
   'Top with the lamb, a spoon of {natural-yoghurt}, {pomegranate-seeds} and {fresh-mint}.'],
  serves=6, tier='everyday')

R('baked-camembert', 'Baked camembert with garlic and rosemary', 'starter',
  ['camembert 250g', 'garlic-clove 1', 'fresh-rosemary 2', 'honey 1tbsp', 'sourdough 6'],
  ['Heat the oven to 200C. Take {camembert} out of its wrapping. Put back in its box.',
   'Cut small slits in the top.',
   'Slice {garlic-clove}. Push slivers and {fresh-rosemary} into the slits.',
   'Drizzle with {honey}. Bake 15 minutes, until molten.',
   'Toast {sourdough}. Cut into soldiers for dipping.'],
  serves=4, tier='everyday', note='Most camembert is made with animal rennet; check if that matters.')

# ---- Mains ----
R('lamb-kleftiko', 'Slow-cooked lamb with lemon and oregano', 'main',
  ['lamb-leg 1800g', 'garlic-clove 6', 'lemon 2', 'dried-oregano 2tbsp', 'olive-oil 3tbsp', 'potato-large 4', 'red-onion 2', 'wine-white 200ml'],
  ['Heat the oven to 160C.',
   'Cut slits in {lamb-leg}. Push in sliced {garlic-clove}.',
   'Rub with the juice of {lemon}, {dried-oregano} and {olive-oil}.',
   'Cut {potato-large} and {red-onion} into wedges. Put in a deep tin. Sit the lamb on top.',
   'Pour in {wine-white}. Cover tightly with foil.',
   'Cook 4 hours, until the meat falls from the bone. Uncover for the last 30 minutes.'],
  serves=6, tier='special', note='The foil keeps the steam in. That is what makes it fall apart.')

R('maple-orange-gammon', 'Maple and orange glazed gammon', 'main',
  ['gammon-joint 2000g', 'orange 2', 'bay-leaf 2', 'maple-syrup 4tbsp', 'mustard-dijon 1tbsp', 'cloves 20'],
  ['Put {gammon-joint} in a large pan. Cover with cold water. Add the juice of one {orange} and {bay-leaf}.',
   'Simmer 1 hour 40 minutes. Lift out. Cool a little.',
   'Heat the oven to 200C. Cut off the skin, leaving the fat.',
   'Score the fat into diamonds. Push a clove from {cloves} into each.',
   'Mix {maple-syrup}, {mustard-dijon} and the zest of the second orange. Brush over.',
   'Roast 25 minutes, brushing twice, until sticky and golden.'],
  serves=8, tier='special')

R('lemon-tarragon-chicken', 'Roast chicken with lemon and tarragon', 'main',
  ['chicken-whole 1500g', 'lemon 1', 'butter-unsalted 40g', 'fresh-tarragon 10g', 'garlic-clove 4', 'wine-white 150ml'],
  ['Heat the oven to 200C.',
   'Mix soft {butter-unsalted} with chopped {fresh-tarragon} and the zest of {lemon}.',
   'Push the butter under the skin of {chicken-whole}.',
   'Put the zested lemon and {garlic-clove} inside the bird. Sit in a tin.',
   'Roast 1 hour 20 minutes, until the juices run clear.',
   'Rest 15 minutes. Add {wine-white} to the tin. Bubble on the hob for a quick gravy.'],
  serves=4, tier='everyday')

R('herb-crust-salmon', 'Herb-crusted side of salmon', 'main',
  ['salmon-fillet 6', 'fresh-parsley 20g', 'fresh-dill 10g', 'lemon 1', 'breadcrumbs-dried 50g', 'olive-oil 2tbsp', 'mustard-dijon 1tbsp'],
  ['Heat the oven to 200C. Lay {salmon-fillet} on a lined tray.',
   'Chop {fresh-parsley} and {fresh-dill}. Mix with {breadcrumbs-dried}, the zest of {lemon} and {olive-oil}.',
   'Brush the salmon with {mustard-dijon}.',
   'Press the crumbs on top.',
   'Roast 15 minutes, until the crumbs are golden and the fish flakes.',
   'Serve with lemon wedges.'],
  serves=6, tier='special')

R('hake-pea-crush', 'Hake with crushed peas and mint', 'main',
  ['peas-frozen 400g', 'olive-oil 3tbsp', 'fresh-mint 10g', 'lemon 1', 'hake-fillet 600g', 'flour-plain 2tbsp'],
  ['Cook {peas-frozen} 3 minutes. Drain.',
   'Crush with 2 tbsp of {olive-oil}, chopped {fresh-mint} and the juice of {lemon}.',
   'Dust {hake-fillet} in {flour-plain}.',
   'Fry in the rest of the oil 4 minutes skin side down. Turn. Cook 2 minutes more.',
   'Serve on the crushed peas.'],
  serves=4, tier='everyday')

R('scallop-pea-risotto', 'Scallop and pea risotto', 'main',
  ['stock-vegetable 1200ml', 'butter-unsalted 40g', 'shallot 2', 'rice-arborio-dry 300g', 'wine-white 125ml', 'peas-frozen 200g', 'lemon 1', 'scallops 12', 'olive-oil 1tbsp'],
  ['Warm {stock-vegetable}. Melt half of {butter-unsalted} in a wide pan.',
   'Chop {shallot}. Fry 4 minutes. Add {rice-arborio-dry}. Stir 1 minute.',
   'Add {wine-white}. Add the stock a ladle at a time, stirring, about 18 minutes.',
   'Add {peas-frozen} for the last 4 minutes. Stir in the rest of the butter and the zest of {lemon}.',
   'Sear {scallops} in {olive-oil} on a high heat 90 seconds a side.',
   'Serve the scallops on the risotto.'],
  serves=4, tier='special')

R('spanakopita', 'Spinach and feta filo pie', 'main',
  ['olive-oil 4tbsp', 'onion-medium 1', 'spinach 500g', 'feta 200g', 'ricotta 200g', 'egg-medium 2', 'nutmeg 0.25tsp', 'filo-pastry 10'],
  ['Heat the oven to 190C. Fry chopped {onion-medium} in 1 tbsp of {olive-oil} 6 minutes.',
   'Add {spinach}. Stir until wilted. Squeeze out the water in a sieve.',
   'Mix the spinach with crumbled {feta}, {ricotta}, {egg-medium} and {nutmeg}.',
   'Layer 6 sheets of {filo-pastry} in a dish, brushing each with oil.',
   'Spread in the filling. Scrunch the last sheets on top. Brush with oil.',
   'Bake 40 minutes, until crisp and golden.'],
  serves=6, tier='everyday')

R('leek-gruyere-tart', 'Leek and Gruyère tart', 'main',
  ['shortcrust-pastry 320g', 'butter-unsalted 25g', 'leek 3', 'egg-medium 3', 'double-cream 250ml', 'gruyere 100g', 'nutmeg 0.25tsp'],
  ['Heat the oven to 190C. Line a 23 cm tin with {shortcrust-pastry}.',
   'Bake 15 minutes with baking beans. Take them out.',
   'Slice {leek}. Fry in {butter-unsalted} 10 minutes, until soft.',
   'Whisk {egg-medium}, {double-cream} and {nutmeg}.',
   'Spread the leeks in the case. Scatter grated {gruyere}. Pour over the cream.',
   'Lower the oven to 170C. Bake 30 minutes, until barely set.'],
  serves=6, tier='everyday', swaps=[('gruyere', 'Mature cheddar, or a vegetarian Alpine-style cheese')])

R('spring-veg-pie', 'Spring vegetable pie', 'main',
  ['butter-unsalted 30g', 'leek 2', 'new-potatoes 12', 'asparagus 10', 'peas-frozen 150g', 'flour-plain 2tbsp', 'stock-vegetable 300ml', 'creme-fraiche 150ml', 'puff-pastry 320g', 'egg-medium 1'],
  ['Heat the oven to 200C. Boil halved {new-potatoes} 10 minutes. Drain.',
   'Slice {leek}. Fry in {butter-unsalted} 6 minutes.',
   'Stir in {flour-plain}. Add {stock-vegetable} slowly until thick.',
   'Add the potatoes, {asparagus} in short lengths, {peas-frozen} and {creme-fraiche}.',
   'Tip into a pie dish. Top with {puff-pastry}. Brush with beaten {egg-medium}.',
   'Bake 30 minutes, until golden.'],
  serves=6, tier='everyday')

R('herb-cauliflower', 'Whole roast cauliflower with herbs and pistachios', 'main',
  ['cauliflower-head 1', 'olive-oil 4tbsp', 'cumin-ground 1tsp', 'fresh-parsley 20g', 'fresh-mint 10g', 'lemon 1', 'pistachios 40g', 'pomegranate-seeds 60g'],
  ['Heat the oven to 200C. Trim the leaves of {cauliflower-head}.',
   'Boil whole 8 minutes. Drain.',
   'Rub with 2 tbsp of {olive-oil} and {cumin-ground}. Roast 40 minutes, until browned.',
   'Chop {fresh-parsley} and {fresh-mint}. Mix with the rest of the oil and the juice of {lemon}.',
   'Spoon over the cauliflower.',
   'Scatter with chopped {pistachios} and {pomegranate-seeds}.'],
  serves=4, tier='everyday')

R('chickpea-tagine', 'Spring vegetable and chickpea tagine', 'main',
  ['olive-oil 2tbsp', 'onion-medium 1', 'ras-el-hanout 2tbsp', 'carrot-medium 3', 'chickpeas-tinned 2', 'chopped-tomatoes-tinned 1', 'dried-apricots 80g', 'stock-vegetable 300ml', 'couscous-dry 250g', 'fresh-coriander 15g'],
  ['Fry chopped {onion-medium} in {olive-oil} 8 minutes.',
   'Add {ras-el-hanout}. Fry 1 minute.',
   'Add sliced {carrot-medium}, drained {chickpeas-tinned}, {chopped-tomatoes-tinned}, {dried-apricots} and {stock-vegetable}.',
   'Simmer 25 minutes, until the carrots are tender.',
   'Pour 300 ml boiling water over {couscous-dry}. Cover 5 minutes. Fluff.',
   'Serve the tagine on the couscous. Scatter {fresh-coriander}.'],
  serves=4, tier='budget')

R('stuffed-peppers', 'Lemon and herb lentil-stuffed peppers', 'main',
  ['pepper-bell 4', 'olive-oil 3tbsp', 'red-onion 1', 'garlic-clove 2', 'lentils-tinned 1', 'rice-white-cooked 1', 'lemon 1', 'fresh-parsley 20g', 'cherry-tomato 12'],
  ['Heat the oven to 190C. Halve {pepper-bell}. Take out the seeds.',
   'Fry chopped {red-onion} and {garlic-clove} in 2 tbsp of {olive-oil} 8 minutes.',
   'Stir in drained {lentils-tinned}, {rice-white-cooked}, the zest and juice of {lemon} and chopped {fresh-parsley}.',
   'Fill the peppers. Sit in a dish with halved {cherry-tomato}.',
   'Drizzle with the rest of the oil.',
   'Bake 35 minutes, until the peppers are soft.'],
  serves=4, tier='budget')

# ---- Sides ----
R('rosemary-new-potatoes', 'Rosemary roast new potatoes', 'side',
  ['new-potatoes 24', 'olive-oil 3tbsp', 'fresh-rosemary 3', 'garlic-clove 4', 'salt 0.5tsp'],
  ['Heat the oven to 200C.',
   'Halve {new-potatoes}. Toss with {olive-oil}, {fresh-rosemary}, whole {garlic-clove} and {salt}.',
   'Roast 40 minutes, shaking once, until crisp.'],
  serves=6, tier='budget')

R('minted-peas', 'Minted peas', 'side',
  ['peas-frozen 400g', 'olive-oil 1tbsp', 'fresh-mint 10g'],
  ['Cook {peas-frozen} in boiling water 3 minutes.',
   'Drain.',
   'Toss with {olive-oil} and chopped {fresh-mint}.'],
  serves=6, tier='budget')

R('cumin-honey-carrots', 'Honey and cumin roast carrots', 'side',
  ['carrot-medium 10', 'olive-oil 2tbsp', 'cumin-ground 1tsp', 'honey 2tbsp'],
  ['Heat the oven to 200C.',
   'Halve {carrot-medium} lengthways. Toss with {olive-oil} and {cumin-ground}.',
   'Roast 25 minutes.',
   'Drizzle with {honey}. Roast 10 minutes more, until sticky.'],
  serves=6, tier='budget')

R('creamed-spinach', 'Creamed spinach', 'side',
  ['butter-unsalted 20g', 'garlic-clove 1', 'spinach 500g', 'double-cream 100ml', 'nutmeg 0.25tsp'],
  ['Melt {butter-unsalted} in a large pan. Add crushed {garlic-clove}.',
   'Add {spinach} in handfuls, stirring until wilted.',
   'Tip into a sieve. Press out the water.',
   'Return to the pan with {double-cream} and {nutmeg}. Bubble 2 minutes.'],
  serves=4, tier='budget')

R('broccoli-almonds', 'Broccoli with toasted almonds', 'side',
  ['broccoli-head 1', 'almonds 40g', 'olive-oil 2tbsp', 'lemon 1'],
  ['Cut {broccoli-head} into florets. Boil 4 minutes. Drain.',
   'Chop {almonds}. Toast in {olive-oil} 2 minutes, until golden.',
   'Toss with the broccoli.',
   'Squeeze over {lemon}.'],
  serves=4, tier='budget')

# ---- Puddings ----
R('simnel-cake', 'Simnel cake', 'pudding',
  ['butter-unsalted 175g', 'sugar-soft-brown 175g', 'egg-medium 3', 'flour-plain 225g', 'mixed-spice 2tsp', 'sultanas 250g', 'currants 100g', 'mixed-peel 50g', 'marzipan 500g', 'jam-strawberry 2tbsp'],
  ['Heat the oven to 150C. Line a 20 cm deep tin.',
   'Beat {butter-unsalted} and {sugar-soft-brown}. Beat in {egg-medium}.',
   'Fold in {flour-plain}, {mixed-spice}, {sultanas}, {currants} and {mixed-peel}.',
   'Put half in the tin. Roll a third of {marzipan} into a disc. Lay on top. Add the rest.',
   'Bake 2 hours 15 minutes, until a skewer comes out clean. Cool.',
   'Brush with warm {jam-strawberry}. Cover with a disc of marzipan. Roll 11 balls for the top.'],
  serves=12, tier='everyday', note='Eleven balls, for the apostles without Judas.',
  swaps=[('strawberry jam', 'Apricot jam, the traditional glue')])

R('hot-cross-bun-pudding', 'Hot cross bun bread and butter pudding', 'pudding',
  ['hot-cross-bun 6', 'butter-unsalted 40g', 'egg-medium 3', 'milk-whole 300ml', 'double-cream 200ml', 'sugar-caster 50g', 'vanilla-extract 1tsp'],
  ['Heat the oven to 170C.',
   'Halve {hot-cross-bun}. Spread with {butter-unsalted}. Layer in a dish.',
   'Whisk {egg-medium}, {milk-whole}, {double-cream}, {sugar-caster} and {vanilla-extract}.',
   'Pour over. Leave 15 minutes to soak.',
   'Bake 35 minutes, until set and golden.'],
  serves=6, tier='budget')

R('chocolate-nests', 'Chocolate Easter nests', 'pudding',
  ['milk-chocolate-bar 4', 'butter-unsalted 40g', 'golden-syrup 2tbsp', 'cornflakes 100g'],
  ['Break {milk-chocolate-bar} into a bowl with {butter-unsalted} and {golden-syrup}.',
   'Melt over a pan of barely simmering water, stirring.',
   'Stir in {cornflakes} until coated.',
   'Spoon into 12 paper cases. Press a dip in the middle.',
   'Chill 1 hour, until set. Fill with small chocolate eggs.'],
  serves=12, tier='budget', note='A good one to make with children.')

R('lemon-meringue-pie', 'Lemon meringue pie', 'pudding',
  ['shortcrust-pastry 320g', 'cornflour 3tbsp', 'sugar-caster 300g', 'lemon 3', 'egg-medium 4', 'butter-unsalted 50g'],
  ['Heat the oven to 190C. Line a 23 cm tin with {shortcrust-pastry}. Bake 20 minutes with baking beans.',
   'Mix {cornflour} with 100 g of {sugar-caster}, the zest and juice of {lemon} and 250 ml water.',
   'Stir over a medium heat until thick. Take off the heat. Beat in {butter-unsalted}.',
   'Separate {egg-medium}. Beat the yolks into the lemon. Pour into the case.',
   'Whisk the whites stiff. Whisk in the rest of the sugar a spoon at a time, until glossy.',
   'Pile on top. Bake at 160C for 20 minutes, until golden.'],
  serves=8, tier='everyday')

R('carrot-cake', 'Carrot cake with cream cheese icing', 'pudding',
  ['vegetable-oil 200ml', 'sugar-soft-brown 225g', 'egg-medium 3', 'flour-self-raising 225g', 'cinnamon-ground 2tsp', 'carrot-medium 4', 'walnuts 80g', 'cream-cheese 200g', 'icing-sugar 100g'],
  ['Heat the oven to 180C. Line a 20 cm tin.',
   'Whisk {vegetable-oil}, {sugar-soft-brown} and {egg-medium}.',
   'Fold in {flour-self-raising} and {cinnamon-ground}.',
   'Grate {carrot-medium}. Stir in with chopped {walnuts}.',
   'Bake 50 minutes, until a skewer comes out clean. Cool.',
   'Beat {cream-cheese} with {icing-sugar}. Spread over the top.'],
  serves=10, tier='budget')

R('vegan-chocolate-mousse', 'Silky vegan chocolate mousse', 'pudding',
  ['dark-chocolate-70 150g', 'tofu-silken 300g', 'maple-syrup 3tbsp', 'vanilla-extract 1tsp', 'raspberries 100g'],
  ['Melt {dark-chocolate-70} over a pan of barely simmering water.',
   'Blend {tofu-silken} until smooth.',
   'Add the chocolate, {maple-syrup} and {vanilla-extract}. Blend until glossy.',
   'Spoon into 4 glasses. Chill 2 hours, until set.',
   'Top with {raspberries}.'],
  serves=4, tier='everyday', note='Nobody guesses the tofu.')

R('chocolate-strawberries', 'Chocolate-dipped strawberries', 'pudding',
  ['dark-chocolate-70 100g', 'strawberries 400g', 'desiccated-coconut 2tbsp'],
  ['Melt {dark-chocolate-70} over a pan of barely simmering water.',
   'Hold {strawberries} by the stalk. Dip halfway into the chocolate.',
   'Sprinkle some with {desiccated-coconut}.',
   'Lay on baking paper. Chill 30 minutes, until set.'],
  serves=6, tier='everyday')

R('banana-chocolate-loaf', 'Vegan banana and chocolate loaf', 'pudding',
  ['banana-medium 3', 'dairy-free-spread 100g', 'sugar-soft-brown 120g', 'oat-milk 80ml', 'flour-self-raising 225g', 'cocoa-powder 2tbsp', 'dark-chocolate-70 60g'],
  ['Heat the oven to 180C. Line a 900 g loaf tin.',
   'Mash {banana-medium}.',
   'Melt {dairy-free-spread}. Mix with the banana, {sugar-soft-brown} and {oat-milk}.',
   'Fold in {flour-self-raising}, {cocoa-powder} and chopped {dark-chocolate-70}.',
   'Bake 50 minutes, until a skewer comes out clean.'],
  serves=8, tier='budget')

# ---- Drinks ----
R('orange-passion-sparkle', 'Orange and passion fruit sparkle', 'drink',
  ['orange-juice 400ml', 'passion-fruit 4', 'sparkling-water 1'],
  ['Pour {orange-juice} into a jug.',
   'Halve {passion-fruit}. Scoop in the seeds.',
   'Top up with {sparkling-water} and ice.'],
  serves=6, tier='budget')

R('mint-iced-tea', 'Lemon and mint iced tea', 'drink',
  ['tea-bags 3', 'water 1000ml', 'honey 3tbsp', 'lemon 1', 'fresh-mint 10g'],
  ['Pour {water}, boiling, over {tea-bags}. Leave 4 minutes. Take out the bags.',
   'Stir in {honey}. Cool.',
   'Add sliced {lemon} and {fresh-mint}.',
   'Chill. Serve over ice.'],
  serves=6, tier='budget')

R('bellini', 'Peach bellini', 'drink',
  ['peach 2', 'sugar-caster 1tbsp', 'sparkling-wine 750ml'],
  ['Peel and stone {peach}. Blend with {sugar-caster} until smooth.',
   'Put 2 spoons in each glass.',
   'Top up slowly with chilled {sparkling-wine}.'],
  serves=6, tier='everyday')

R('orange-blossom-spritz', 'Orange blossom spritz', 'drink',
  ['orange-liqueur 60ml', 'orange-juice 200ml', 'sparkling-wine 750ml', 'orange 1'],
  ['Divide {orange-liqueur} and {orange-juice} between 6 glasses.',
   'Add ice.',
   'Top up with {sparkling-wine}.',
   'Add a slice of {orange}.'],
  serves=6, tier='everyday')

# ---- Menus ----
OPS = ('Orange and passion fruit sparkle', 'eas-orange-passion-sparkle')
TEA = ('Lemon and mint iced tea', 'eas-mint-iced-tea')
BEL = ('Peach bellini', 'eas-bellini')
SPR = ('Orange blossom spritz', 'eas-orange-blossom-spritz')

M('easter-lamb', 'Easter Sunday lamb', 'meat', 6, 'Pea and ham soup, slow-cooked lamb with lemon and oregano, simnel cake.',
  ('eas-pea-ham-soup', OPS, 'A dry fino sherry'),
  ('eas-lamb-kleftiko', TEA, 'A Rioja Reserva or Greek Agiorgitiko', ['eas-minted-peas', 'eas-cumin-honey-carrots']),
  ('eas-simnel-cake', 'A pot of tea', 'A small glass of Madeira'))
M('easter-gammon', 'Glazed gammon lunch', 'meat', 8, 'Devilled eggs, maple and orange gammon, lemon meringue pie.',
  ('eas-devilled-eggs', OPS, BEL),
  ('eas-maple-orange-gammon', 'Cloudy apple juice', 'A Pinot Noir or dry rosé', ['eas-rosemary-new-potatoes', 'eas-creamed-spinach', 'eas-cumin-honey-carrots']),
  ('eas-lemon-meringue-pie', TEA, 'A sweet Moscato'))
M('easter-chicken', 'Easter roast chicken', 'meat', 4, 'Spiced lamb flatbreads, lemon and tarragon chicken, hot cross bun pudding.',
  ('eas-lamb-flatbreads', TEA, 'A dry rosé'),
  ('eas-lemon-tarragon-chicken', OPS, 'A white Burgundy', ['eas-rosemary-new-potatoes', 'eas-broccoli-almonds']),
  ('eas-hot-cross-bun-pudding', 'Cold milk or a pot of tea', SPR))
M('easter-salmon', 'Good Friday salmon', 'fish', 6, 'Smoked salmon pâté, a herb-crusted side of salmon, carrot cake.',
  ('eas-smoked-salmon-pate', OPS, BEL),
  ('eas-herb-crust-salmon', TEA, 'A Sancerre or Albariño', ['eas-rosemary-new-potatoes', 'eas-minted-peas']),
  ('eas-carrot-cake', 'A pot of tea', 'A late-harvest Riesling'))
M('easter-hake', 'Hake and crushed peas', 'fish', 4, 'Carrot and ginger soup, hake with crushed peas, chocolate nests.',
  ('eas-carrot-ginger-soup', OPS, 'A dry Riesling'),
  ('eas-hake-pea-crush', TEA, 'A Picpoul de Pinet', ['eas-rosemary-new-potatoes']),
  ('eas-chocolate-nests', 'Cold milk', SPR))
M('easter-scallops', 'Crab and scallops', 'shellfish', 4, 'Crab and avocado, scallop and pea risotto, chocolate-dipped strawberries.',
  ('eas-crab-avocado', OPS, 'A chilled Albariño'),
  ('eas-scallop-pea-risotto', TEA, 'A white Burgundy'),
  ('eas-chocolate-strawberries', 'Mint tea', BEL))
M('easter-spanakopita', 'Greek Easter table', 'vegetarian', 6, 'Baked camembert, spinach and feta filo pie, lemon meringue pie.',
  ('eas-baked-camembert', OPS, 'A dry Assyrtiko'),
  ('eas-spanakopita', TEA, 'A Greek white or a Provence rosé', ['eas-broccoli-almonds', 'eas-cumin-honey-carrots']),
  ('eas-lemon-meringue-pie', 'A pot of tea', SPR))
M('easter-leek-tart', 'Leek tart lunch', 'vegetarian', 6, 'Devilled eggs, leek and Gruyère tart, hot cross bun pudding.',
  ('eas-devilled-eggs', TEA, BEL),
  ('eas-leek-gruyere-tart', OPS, 'An Alsace Pinot Blanc', ['eas-minted-peas']),
  ('eas-hot-cross-bun-pudding', 'Cold milk', 'A sweet Muscat'))
M('easter-veg-pie', 'Spring vegetable pie', 'vegetarian', 6, 'Pea and mint hummus, a spring vegetable pie, simnel cake.',
  ('eas-pea-hummus', OPS, 'A Grüner Veltliner'),
  ('eas-spring-veg-pie', TEA, 'An oaked Chardonnay', ['eas-cumin-honey-carrots']),
  ('eas-simnel-cake', 'A pot of tea', 'A small glass of Madeira'))
M('easter-cauliflower-vegan', 'Easter roast cauliflower', 'vegan', 4, 'Carrot and ginger soup, whole roast cauliflower, silky chocolate mousse.',
  ('eas-carrot-ginger-soup', OPS, 'A dry Riesling'),
  ('eas-herb-cauliflower', TEA, 'A Provence rosé', ['eas-rosemary-new-potatoes', 'eas-minted-peas']),
  ('eas-vegan-chocolate-mousse', 'Mint tea', BEL))
M('easter-tagine-vegan', 'Easter tagine', 'vegan', 4, 'Pea and mint hummus, a spring vegetable tagine, chocolate-dipped strawberries.',
  ('eas-pea-hummus', OPS, 'A dry rosé'),
  ('eas-chickpea-tagine', TEA, 'A Grenache'),
  ('eas-chocolate-strawberries', 'Mint tea', SPR))
M('easter-peppers-vegan', 'Stuffed peppers', 'vegan', 4, 'Carrot and ginger soup, lentil-stuffed peppers, banana and chocolate loaf.',
  ('eas-carrot-ginger-soup', OPS, 'A Viognier'),
  ('eas-stuffed-peppers', TEA, 'A Tempranillo', ['eas-broccoli-almonds']),
  ('eas-banana-chocolate-loaf', 'Hot oat milk', SPR))
