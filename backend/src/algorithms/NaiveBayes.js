class NaiveBayes {

    train(history) {

        const count = {};

        history.forEach(item => {

            const c = item.category || "other";

            count[c] = (count[c] || 0) + 1;

        });

        return count;
    }

    predict(history) {

        const model = this.train(history);

        let bestCategory = "other";
        let max = 0;

        Object.keys(model).forEach(category => {

            if(model[category] > max){

                max = model[category];

                bestCategory = category;

            }

        });

        return bestCategory;
    }

}

module.exports = NaiveBayes;